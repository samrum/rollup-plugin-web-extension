import fs from "fs";
import type { OutputBundle } from "rollup";
import {
  getContentScriptLoaderFile,
  getScriptHtmlLoaderFile,
} from "../utils/loader";
import { setVirtualModule } from "../utils/virtualModule";
import ManifestParser, {
  ManifestParserConfig,
  ParseResult,
} from "./manifestParser";
import {
  parseManifestHtmlFile,
  pipe,
  getNameFromFileName,
  findBundleOutputChunkForScript,
  outputChunkHasImports,
  isSingleHtmlFilename,
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

  #parseManifestHtmlFiles(
    result: ManifestV2ParseResult
  ): ManifestV2ParseResult {
    const htmlFileNames: (string | undefined)[] = [
      result.manifest.background?.page,
      result.manifest.browser_action?.default_popup,
      result.manifest.options_ui?.page,
      ...(result.manifest.web_accessible_resources ?? []).filter(
        isSingleHtmlFilename
      ),
    ];

    htmlFileNames.forEach((htmlFileName) =>
      parseManifestHtmlFile(htmlFileName, result)
    );

    return result;
  }

  #parseManifestContentScripts(
    result: ManifestV2ParseResult
  ): ManifestV2ParseResult {
    result.manifest.content_scripts?.forEach((script) => {
      script.js?.forEach((scriptFile) => {
        const outputFile = getNameFromFileName(scriptFile);

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

    const htmlLoaderFile = getScriptHtmlLoaderFile(
      "background",
      result.manifest.background.scripts
    );

    const outputFile = getNameFromFileName(htmlLoaderFile.fileName);

    setVirtualModule(htmlLoaderFile.fileName, htmlLoaderFile.source);

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
