import fs from "fs";
import path from "path";
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
    result: ManifestV2ParseResult
  ): ManifestV2ParseResult {
    result.manifest.content_scripts?.forEach((script) => {
      script.js?.forEach((scriptFile, index) => {
        const { dir, name } = path.parse(scriptFile);
        const outputFile = dir ? `${dir}/${name}` : name;

        result.inputScripts.push([outputFile, scriptFile]);

        script.js![index] = `${outputFile}.js`;
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

    const htmlScriptElements: string[] = [];

    result.manifest.background.scripts.forEach((script) => {
      if (isRemoteUrl(script)) {
        throw new Error(
          `Background scripts cannot be remote locations -- ${script}`
        );
      }

      const { dir, name } = path.parse(script);
      const outputFile = dir ? `${dir}/${name}` : name;

      result.inputScripts.push([outputFile, script]);

      htmlScriptElements.push(
        `<script type="module" src="/${outputFile}.js"></script>`
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

  #parseManifestHtmlFiles(
    result: ManifestV2ParseResult
  ): ManifestV2ParseResult {
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
    manifest: ManifestV2ParseResult["manifest"]
  ): Promise<ManifestV2ParseResult> {
    let result = {
      inputScripts: [],
      emitFiles: [],
      manifest: manifest,
    };

    return this.#parseBundleForDynamicContentScripts(result, bundle);
  }

  #parseBundleForDynamicContentScripts(
    result: ManifestV2ParseResult,
    bundle: OutputBundle
  ): ManifestV2ParseResult {
    const webAccessibleResources = new Set(
      result.manifest.web_accessible_resources ?? []
    );

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
