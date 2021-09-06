import fs from "fs";
import ManifestParser, { ParseResult } from "./manifestParser";
import { getScriptLoaderFile, parseManifestHtmlFile } from "./manifestUtils";
import type { OutputBundle } from "rollup";
import { isOutputChunk } from "./../rollup";

export default class ManifestV2 implements ManifestParser {
  constructor(
    private manifest: chrome.runtime.ManifestV2,
    private isWatchMode: boolean = false
  ) {}

  parseManifestContentScripts(): ParseResult {
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

  parseManifestHtmlFiles(): ParseResult {
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
