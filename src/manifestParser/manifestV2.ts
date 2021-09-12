import fs from "fs";
import ManifestParser, { ParseResult } from "./manifestParser";
import { getScriptLoaderFile, parseManifestHtmlFile } from "./utils";
import type { OutputBundle } from "rollup";
import { isOutputChunk } from "../rollup";

export default class ManifestV2 implements ManifestParser {
  constructor(
    private manifest: chrome.runtime.ManifestV2,
    private isWatchMode: boolean = false
  ) {}

  parseManifest(): ParseResult {
    const { inputScripts: htmlInputScripts, emitFiles: htmlEmitFiles } =
      this.#parseManifestHtmlFiles();

    const {
      inputScripts: contentScriptInputScripts,
      emitFiles: contentScriptEmitFiles,
    } = this.#parseManifestContentScripts();

    const {
      inputScripts: backgroundInputScripts,
      emitFiles: backgroundEmitFiles,
    } = this.#parseManifestBackgroundScripts();

    return {
      inputScripts: [
        ...contentScriptInputScripts,
        ...backgroundInputScripts,
        ...htmlInputScripts,
      ],
      emitFiles: [
        ...contentScriptEmitFiles,
        ...backgroundEmitFiles,
        ...htmlEmitFiles,
      ],
    };
  }

  #parseManifestContentScripts(): ParseResult {
    const result: ParseResult = {
      inputScripts: [],
      emitFiles: [],
    };

    this.manifest.content_scripts?.forEach((script) => {
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

  #parseManifestBackgroundScripts(): ParseResult {
    const result: ParseResult = {
      inputScripts: [],
      emitFiles: [],
    };

    if (!this.manifest.background?.scripts) {
      return result;
    }

    const htmlScriptElements: string[] = [];

    this.manifest.background.scripts.forEach((script) => {
      const output = `${script.split(".")[0]}`;

      result.inputScripts.push([output, script]);

      htmlScriptElements.push(
        `<script type="module" src="${output}.js"></script>`
      );
    });

    const scriptLoaderHtmlFileName = "loader/background.html";
    const scriptsHtml = htmlScriptElements.join("\n");

    result.emitFiles.push({
      type: "asset",
      fileName: scriptLoaderHtmlFileName,
      source: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />${scriptsHtml}</head></html>`,
    });

    delete this.manifest.background.scripts;
    this.manifest.background.page = scriptLoaderHtmlFileName;

    return result;
  }

  #parseManifestHtmlFiles(): ParseResult {
    const result: ParseResult = {
      inputScripts: [],
      emitFiles: [],
    };

    const htmlFileNames: (string | undefined)[] = [
      this.manifest.background?.page,
      this.manifest.browser_action?.default_popup,
    ];

    htmlFileNames.forEach((htmlFileName) => {
      if (!htmlFileName) {
        return;
      }

      const { inputScripts, emitFiles } = parseManifestHtmlFile(htmlFileName);

      result.inputScripts = result.inputScripts.concat(inputScripts);
      result.emitFiles = result.emitFiles.concat(emitFiles);
    });

    return result;
  }

  parseBundleForDynamicContentScripts(bundle: OutputBundle): ParseResult {
    const result: ParseResult = {
      inputScripts: [],
      emitFiles: [],
    };

    const webAccessibleResources = new Set(
      this.manifest.web_accessible_resources ?? []
    );

    if (this.isWatchMode) {
      // allow web-ext manifest reloading to work with rebuilt assets during watch
      webAccessibleResources.add("assets/*");
    }

    this.manifest.content_scripts?.forEach((script) => {
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
      this.manifest.web_accessible_resources = Array.from(
        webAccessibleResources
      );
    }

    return result;
  }

  getManifest(): chrome.runtime.ManifestV2 {
    return this.manifest;
  }
}
