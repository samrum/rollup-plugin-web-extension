import fs from "fs";
import type { OutputBundle } from "rollup";
import ManifestParser, {
  ManifestParserConfig,
  ParseResult,
} from "./manifestParser";
import {
  getScriptLoaderFile,
  parseManifestHtmlFile,
  pipe,
  isRemoteUrl,
  getLoaderDirectory,
} from "./utils";
import { isOutputChunk } from "../rollupUtils";

type ManifestVersion = chrome.runtime.ManifestV2;
type ManifestParseResult = ParseResult<ManifestVersion>;

export default class ManifestV2 implements ManifestParser<ManifestVersion> {
  constructor(private config: ManifestParserConfig) {}

  async parseManifest(manifest: ManifestVersion): Promise<ManifestParseResult> {
    return pipe(
      this,
      {
        inputScripts: [],
        emitFiles: [],
        manifest: manifest,
      },
      this.#parseManifestHtmlFiles,
      this.#parseManifestContentScripts,
      this.#parseManifestBackgroundScripts
    );
  }

  #parseManifestContentScripts(
    result: ManifestParseResult
  ): ManifestParseResult {
    result.manifest.content_scripts?.forEach((script) => {
      script.js?.forEach((scriptFile, index) => {
        const output = `${scriptFile.split(".")[0]}`;

        result.inputScripts.push([output, scriptFile]);

        script.js![index] = `${output}.js`;
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
    result: ManifestParseResult
  ): ManifestParseResult {
    if (!result.manifest.background?.scripts) {
      return result;
    }

    const htmlScriptElements: string[] = [];

    result.manifest.background.scripts.forEach((script) => {
      if (isRemoteUrl(script)) {
        throw new Error(
          `Background scripts cannot be remote locations -- ${script}`
        );
      }

      const output = `${script.split(".")[0]}`;

      result.inputScripts.push([output, script]);

      htmlScriptElements.push(
        `<script type="module" src="/${output}.js"></script>`
      );
    });

    const scriptLoaderHtmlFileName = `${getLoaderDirectory()}/background.html`;
    const scriptsHtml = htmlScriptElements.join("");

    result.emitFiles.push({
      type: "asset",
      fileName: scriptLoaderHtmlFileName,
      source: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />${scriptsHtml}</head></html>`,
    });

    delete result.manifest.background.scripts;
    result.manifest.background.page = scriptLoaderHtmlFileName;

    return result;
  }

  #parseManifestHtmlFiles(result: ManifestParseResult): ManifestParseResult {
    const htmlFileNames: (string | undefined)[] = [
      result.manifest.background?.page,
      result.manifest.browser_action?.default_popup,
      result.manifest.options_ui?.page,
    ];

    htmlFileNames.forEach((htmlFileName) => {
      if (!htmlFileName) {
        return;
      }

      const { inputScripts = [], emitFiles = [] } =
        parseManifestHtmlFile(htmlFileName);

      result.inputScripts = result.inputScripts.concat(inputScripts);
      result.emitFiles = result.emitFiles.concat(emitFiles);
    });

    return result;
  }

  async parseOutputBundle(
    bundle: OutputBundle,
    manifest: ManifestVersion
  ): Promise<ManifestParseResult> {
    let result = {
      inputScripts: [],
      emitFiles: [],
      manifest: manifest,
    };

    return this.#parseBundleForDynamicContentScripts(result, bundle);
  }

  #parseBundleForDynamicContentScripts(
    result: ManifestParseResult,
    bundle: OutputBundle
  ): ManifestParseResult {
    const webAccessibleResources = new Set(
      result.manifest.web_accessible_resources ?? []
    );

    if (this.config.isInWatchMode) {
      // expose all files in watch mode to allow web-ext reloading to work when manifest changes are not applied on reload (eg. Firefox)
      webAccessibleResources.add("*.js");
    }

    result.manifest.content_scripts?.forEach((script) => {
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

        result.emitFiles.push({
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
      result.manifest.web_accessible_resources = Array.from(
        webAccessibleResources
      );
    }

    return result;
  }
}
