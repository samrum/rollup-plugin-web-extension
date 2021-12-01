import path from "path";
import {
  copy,
  emptyDir,
  ensureDir,
  readFile,
  readFileSync,
  writeFile,
} from "fs-extra";
import type { OutputBundle } from "rollup";
import {
  getContentScriptLoaderFile,
  getScriptHtmlLoaderFile,
} from "../utils/loader";
import { getVirtualModule, setVirtualModule } from "../utils/virtualModule";
import ManifestParser, {
  ManifestParserConfig,
  ParseResult,
} from "./manifestParser";
import {
  parseManifestHtmlFile,
  pipe,
  findBundleOutputChunkForScript,
  outputChunkHasImports,
  isSingleHtmlFilename,
  getOutputFileName,
} from "./utils";

interface ManifestV2ParseResult extends ParseResult {
  manifest: chrome.runtime.ManifestV2;
}

export default class ManifestV2 implements ManifestParser {
  constructor(private config: ManifestParserConfig) {}

  async parseManifest(
    manifest: ManifestV2ParseResult["manifest"]
  ): Promise<ManifestV2ParseResult> {
    return pipe(
      this,
      {
        manifest,
        inputScripts: [],
        emitFiles: [],
      },
      this.#parseManifestHtmlFiles,
      this.#parseManifestContentScripts,
      this.#parseManifestBackgroundScripts
    );
  }

  async writeDevServeBuild(manifest: chrome.runtime.ManifestV2) {
    await emptyDir(this.config.viteConfig.build.outDir);
    copy("public", this.config.viteConfig.build.outDir);

    if (typeof this.config.viteConfig.server.hmr! === "boolean") {
      throw new Error("Vite HMR is misconfigured");
    }

    const hmrServerOrigin = `http://${
      this.config.viteConfig.server.hmr!.host
    }:${this.config.viteConfig.server.port}`;

    for (const fileName of this.#getManifestFileNames(manifest)) {
      let content =
        getVirtualModule(fileName) ??
        (await readFile(fileName, {
          encoding: "utf-8",
        }));

      // update root paths
      content = content.replace('src="/', `src="${hmrServerOrigin}/`);

      // update relative paths
      const inputFileDir = path.dirname(fileName);
      content = content.replace(
        'src="./',
        `src="${hmrServerOrigin}/${inputFileDir ? `${inputFileDir}/` : ""}`
      );

      const outFile = `${this.config.viteConfig.build.outDir}/${fileName}`;

      const outFileDir = path.dirname(outFile);

      await ensureDir(outFileDir);

      await writeFile(outFile, content);
    }

    if (manifest.content_scripts) {
      for (const [
        contentScriptIndex,
        script,
      ] of manifest.content_scripts.entries()) {
        if (!script.js) {
          continue;
        }

        for (const [scriptJsIndex, fileName] of script.js.entries()) {
          const outputFileName = getOutputFileName(fileName);

          const scriptLoaderFile = getContentScriptLoaderFile(
            outputFileName,
            `${hmrServerOrigin}/${fileName}`
          );

          manifest.content_scripts[contentScriptIndex].js![scriptJsIndex] =
            scriptLoaderFile.fileName;

          const outFile = `${this.config.viteConfig.build.outDir}/${scriptLoaderFile.fileName}`;

          const outFileDir = path.dirname(outFile);

          await ensureDir(outFileDir);

          await writeFile(outFile, scriptLoaderFile.source);
        }
      }
    }

    await writeFile(
      `${this.config.viteConfig.build.outDir}/manifest.json`,
      JSON.stringify(manifest, null, 2)
    );
  }

  #parseManifestHtmlFiles(
    result: ManifestV2ParseResult
  ): ManifestV2ParseResult {
    this.#getManifestFileNames(result.manifest).forEach((htmlFileName) =>
      parseManifestHtmlFile(htmlFileName, result)
    );

    return result;
  }

  #getManifestFileNames(manifest: chrome.runtime.ManifestV2): string[] {
    return [
      manifest.background?.page,
      manifest.browser_action?.default_popup,
      manifest.options_ui?.page,
      ...(manifest.web_accessible_resources ?? []).filter(isSingleHtmlFilename),
    ].filter((fileName): fileName is string => typeof fileName === "string");
  }

  #parseManifestContentScripts(
    result: ManifestV2ParseResult
  ): ManifestV2ParseResult {
    result.manifest.content_scripts?.forEach((script) => {
      script.js?.forEach((scriptFile) => {
        const outputFile = getOutputFileName(scriptFile);

        result.inputScripts.push([outputFile, scriptFile]);
      });

      script.css?.forEach((cssFile) => {
        result.emitFiles.push({
          type: "asset",
          fileName: cssFile,
          source: readFileSync(cssFile, "utf-8"),
        });
      });
    });

    return result;
  }

  #parseManifestBackgroundScripts(
    result: ManifestV2ParseResult
  ): ManifestV2ParseResult {
    if (!result.manifest.background?.scripts) {
      return result;
    }

    const htmlLoaderFile = getScriptHtmlLoaderFile(
      "background",
      result.manifest.background.scripts
    );

    setVirtualModule(htmlLoaderFile.fileName, htmlLoaderFile.source);

    const outputFile = getOutputFileName(htmlLoaderFile.fileName);

    result.inputScripts.push([outputFile, htmlLoaderFile.fileName]);

    delete result.manifest.background.scripts;
    result.manifest.background.page = htmlLoaderFile.fileName;

    return result;
  }

  async parseOutputBundle(
    bundle: OutputBundle,
    manifest: ManifestV2ParseResult["manifest"]
  ): Promise<ManifestV2ParseResult> {
    let result = {
      inputScripts: [],
      emitFiles: [],
      manifest: manifest,
    };

    return this.#parseBundleContentScripts(result, bundle);
  }

  #parseBundleContentScripts(
    result: ManifestV2ParseResult,
    bundle: OutputBundle
  ): ManifestV2ParseResult {
    const webAccessibleResources = new Set(
      result.manifest.web_accessible_resources ?? []
    );

    result.manifest.content_scripts?.forEach((script) => {
      script.js?.forEach((scriptFileName, index) => {
        const outputChunk = findBundleOutputChunkForScript(
          bundle,
          scriptFileName
        );
        if (!outputChunk) {
          return;
        }

        if (!outputChunkHasImports(outputChunk)) {
          script.js![index] = outputChunk.fileName;

          return;
        }

        const scriptLoaderFile = getContentScriptLoaderFile(
          scriptFileName,
          outputChunk.fileName
        );

        script.js![index] = scriptLoaderFile.fileName;

        result.emitFiles.push({
          type: "asset",
          fileName: scriptLoaderFile.fileName,
          source: scriptLoaderFile.source,
        });

        webAccessibleResources.add(outputChunk.fileName);

        outputChunk.imports.forEach(
          webAccessibleResources.add,
          webAccessibleResources
        );
        outputChunk.dynamicImports.forEach(
          webAccessibleResources.add,
          webAccessibleResources
        );
      });
    });

    if (webAccessibleResources.size > 0) {
      if (this.config.viteConfig.build.watch) {
        // expose all files in watch mode to allow web-ext reloading to work when manifest changes are not applied on reload (eg. Firefox)
        webAccessibleResources.add("*.js");
      }

      result.manifest.web_accessible_resources = Array.from(
        webAccessibleResources
      );
    }

    return result;
  }
}
