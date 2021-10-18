import fs from "fs";
import path from "path";
import { OutputBundle, OutputChunk } from "rollup";
import { isOutputChunk } from "../rollupUtils";
import { ParseResult } from "./manifestParser";

const LOADER_DIR = "loader";

export function parseManifestHtmlFile(
  htmlFileName: string | undefined,
  result: ParseResult
): ParseResult {
  if (!htmlFileName) {
    return result;
  }

  let html = fs.readFileSync(htmlFileName, "utf-8");

  const scriptRegExp = new RegExp('<script[^>]*src="(.*)"[^>]*>', "gi");
  let match;

  while ((match = scriptRegExp.exec(html)) !== null) {
    const [originalScriptElement, scriptFileName] = match;

    if (isRemoteUrl(scriptFileName)) {
      continue;
    }

    const { dir: htmlDir } = path.parse(htmlFileName);
    const {
      dir: scriptDir,
      name: scriptName,
      ext: scriptExt,
    } = path.parse(scriptFileName);

    const outputFile = `${scriptDir || htmlDir}/${scriptName}`;

    let updatedScript = originalScriptElement.replace(
      `src="${scriptFileName}"`,
      `src="/${outputFile}.js"`
    );
    if (!updatedScript.includes('type="module"')) {
      updatedScript = `${updatedScript.slice(0, -1)} type="module">`;
    }

    html = html.replace(originalScriptElement, updatedScript);

    result.inputScripts?.push([outputFile, `${outputFile}${scriptExt}`]);
  }

  result.emitFiles?.push({
    type: "asset",
    fileName: htmlFileName,
    source: html,
  });

  return result;
}

export function isRemoteUrl(url: string): boolean {
  return /^[a-zA-Z]+\:\/\//.test(url);
}

export function getHtmlLoaderFile(htmlFileName: string, scriptSrcs: string[]) {
  const scriptsHtml = scriptSrcs.map((scriptSrc) => {
    return `<script type="module" src="${scriptSrc}"></script>`;
  });

  return {
    fileName: `${LOADER_DIR}/${htmlFileName}`,
    source: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />${scriptsHtml}</head></html>`,
  };
}

export function getContentScriptLoaderFile(scriptFileName: string) {
  return {
    fileName: `${LOADER_DIR}/${scriptFileName}`,
    source: `(async()=>{await import(chrome.runtime.getURL("${scriptFileName}"))})();`,
  };
}

export function getServiceWorkerLoaderFile(serviceWorkerFileName: string) {
  return {
    fileName: `serviceWorkerLoader.js`,
    source: `import "/${serviceWorkerFileName}";`,
  };
}

export function pipe<T>(
  context: any,
  initialValue: T,
  ...fns: ((result: T) => T)[]
): T {
  return fns.reduce(
    (previousValue, fn) => fn.call(context, previousValue),
    initialValue
  );
}

export function getRollupOutputFile(inputFileName: string): string {
  const { dir, name } = path.parse(inputFileName);

  return dir ? `${dir}/${name}` : name;
}

export function findBundleOutputChunkForScript(
  bundle: OutputBundle,
  scriptFileName: string
): OutputChunk | null {
  const [, bundleFile] =
    Object.entries(bundle).find(([, output]) => {
      if (!isOutputChunk(output)) {
        return false;
      }

      return output.facadeModuleId?.endsWith(scriptFileName);
    }) || [];

  if (!bundleFile || !isOutputChunk(bundleFile)) {
    return null;
  }

  return bundleFile;
}

export function outputChunkHasImports(outputChunk: OutputChunk): boolean {
  return Boolean(
    outputChunk.imports.length || outputChunk.dynamicImports.length
  );
}
