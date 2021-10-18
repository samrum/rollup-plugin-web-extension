import fs from "fs";
import type { OutputBundle } from "rollup";
import ManifestParser, {
  ManifestParserConfig,
  ParseResult,
} from "./manifestParser";
import {
  getContentScriptLoaderFile,
  parseManifestHtmlFile,
  pipe,
  isRemoteUrl,
  getHtmlLoaderFile,
  getRollupOutputFile,
  findBundleOutputChunkForScript,
  outputChunkHasImports,
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

  #parseManifestContentScripts(
    result: ManifestV2ParseResult
  ): ManifestV2ParseResult {
    result.manifest.content_scripts?.forEach((script) => {
      script.js?.forEach((scriptFile) => {
        const outputFile = getRollupOutputFile(scriptFile);

        result.inputScripts.push([outputFile, scriptFile]);
      });

      script.css?.forEach((cssFile) => {
        result.emitFiles.push({
          type: "asset",
          fileName: cssFile,
          source: fs.readFileSync(cssFile, "utf-8"),
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

    const htmlScriptSrcs: string[] = [];

    result.manifest.background.scripts.forEach((script) => {
      if (isRemoteUrl(script)) {
        throw new Error(
          `Background scripts cannot be remote locations -- ${script}`
        );
      }

      const outputFile = getRollupOutputFile(script);

      result.inputScripts.push([outputFile, script]);

      htmlScriptSrcs.push(`/${outputFile}.js`);
    });

    const htmlLoaderFile = getHtmlLoaderFile("background.html", htmlScriptSrcs);

    result.emitFiles.push({
      type: "asset",
      fileName: htmlLoaderFile.fileName,
      source: htmlLoaderFile.source,
    });

    delete result.manifest.background.scripts;
    result.manifest.background.page = htmlLoaderFile.fileName;

    return result;
  }

  #parseManifestHtmlFiles(
    result: ManifestV2ParseResult
  ): ManifestV2ParseResult {
    const htmlFileNames: (string | undefined)[] = [
      result.manifest.background?.page,
      result.manifest.browser_action?.default_popup,
      result.manifest.options_ui?.page,
    ];

    htmlFileNames.forEach((htmlFileName) =>
      parseManifestHtmlFile(htmlFileName, result)
    );

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
      if (this.config.isInWatchMode) {
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
