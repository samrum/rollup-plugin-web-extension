import fs from "fs";
import type { OutputBundle, EmittedFile } from "rollup";
import { WebExtensionManifest } from "../types";
import { isOutputChunk } from "./rollup";

export function parseManifestContentScripts(manifest: WebExtensionManifest): {
  inputScripts: [string, string][];
  emitFiles: EmittedFile[];
} {
  const inputScripts: [string, string][] = [];
  const emitFiles: EmittedFile[] = [];

  manifest.content_scripts?.forEach((script) => {
    script.js?.forEach((scriptFile, index) => {
      const output = `${scriptFile.split(".")[0]}`;

      inputScripts.push([output, scriptFile]);

      script.js![index] = `${output}.js`;
    });

    script.css?.forEach((cssFile) => {
      emitFiles.push({
        type: "asset",
        fileName: cssFile,
        source: fs.readFileSync(cssFile, "utf-8"),
      });
    });
  });

  return {
    inputScripts,
    emitFiles,
  };
}

export function parseManifestHtmlFiles(manifest: WebExtensionManifest): {
  inputScripts: [string, string][];
  emitFiles: EmittedFile[];
} {
  let inputScripts: [string, string][] = [];
  let emitFiles: EmittedFile[] = [];

  if (manifest.manifest_version === 2) {
    if (manifest.background?.page) {
      const {
        inputScripts: backgroundInputScripts,
        emitFiles: backgroundEmitFiles,
      } = parseManifestHtmlFile(manifest.background.page);

      inputScripts = inputScripts.concat(backgroundInputScripts);
      emitFiles = emitFiles.concat(backgroundEmitFiles);
    }

    if (manifest.browser_action?.default_popup) {
      const { inputScripts: popupInputScripts, emitFiles: popupEmitFiles } =
        parseManifestHtmlFile(manifest.browser_action.default_popup);

      inputScripts = inputScripts.concat(popupInputScripts);
      emitFiles = emitFiles.concat(popupEmitFiles);
    }
  }

  return {
    inputScripts,
    emitFiles,
  };
}

function parseManifestHtmlFile(htmlFileName: string): {
  inputScripts: [string, string][];
  emitFiles: EmittedFile[];
} {
  const inputScripts: [string, string][] = [];
  const emitFiles: EmittedFile[] = [];
  let html = fs.readFileSync(htmlFileName, "utf-8");

  const scriptRegExp = new RegExp('<script[^>]*src="(.*)"[^>]*>', "gi");
  let match;

  while ((match = scriptRegExp.exec(html)) !== null) {
    const [originalScript, scriptFileName] = match;

    const inputDirectory = htmlFileName.split("/").slice(0, -1).join("/");
    const outputFile = `${scriptFileName.split(".")[0]}`;
    const outputFileName = `${inputDirectory}/${outputFile}`;

    let updatedScript = originalScript.replace(
      `src="${scriptFileName}"`,
      `src="${outputFile}.js"`
    );
    if (!updatedScript.includes('type="module"')) {
      updatedScript = `${updatedScript.slice(0, -1)} type="module">`;
    }

    html = html.replace(originalScript, updatedScript);

    inputScripts.push([outputFileName, `${inputDirectory}/${scriptFileName}`]);
  }

  emitFiles.push({
    type: "asset",
    fileName: htmlFileName,
    source: html,
  });

  return {
    inputScripts,
    emitFiles,
  };
}

export function addDynamicImportsToManifestContentScripts(
  manifest: WebExtensionManifest,
  bundle: OutputBundle,
  isInWatchMode: boolean
): {
  emitFiles: EmittedFile[];
} {
  const emitFiles: EmittedFile[] = [];

  if (manifest.manifest_version !== 2) {
    return {
      emitFiles,
    };
  }

  const webAccessibleResources = new Set(
    manifest.web_accessible_resources ?? []
  );

  if (isInWatchMode) {
    // allow web-ext manifest reloading to work with rebuilt assets during watch
    webAccessibleResources.add("assets/*");
  }

  manifest.content_scripts?.forEach((script) => {
    script.js?.forEach((scriptFileName, index) => {
      const bundleFile = bundle[scriptFileName];

      if (
        !isOutputChunk(bundleFile) ||
        (!bundleFile.imports.length && !bundleFile.dynamicImports.length)
      ) {
        return;
      }

      const scriptLoaderFile = getScriptLoaderFile(scriptFileName);

      script.js![index] = scriptLoaderFile.fileName;

      emitFiles.push({
        type: "asset",
        fileName: scriptLoaderFile.fileName,
        source: scriptLoaderFile.source,
      });

      webAccessibleResources.add(scriptFileName);

      bundleFile.imports.forEach(
        webAccessibleResources.add,
        webAccessibleResources
      );
      bundleFile.dynamicImports.forEach(
        webAccessibleResources.add,
        webAccessibleResources
      );
    });
  });

  if (webAccessibleResources.size > 0) {
    manifest.web_accessible_resources = Array.from(webAccessibleResources);
  }

  return {
    emitFiles,
  };
}

function getScriptLoaderFile(scriptFileName: string) {
  return {
    fileName: `loader/${scriptFileName}`,
    source: `(async()=>{await import(chrome.runtime.getURL("${scriptFileName}"))})();`,
  };
}
