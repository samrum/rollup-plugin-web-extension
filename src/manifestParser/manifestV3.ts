import fs from "fs";
import ManifestParser, { ParseResult } from "./manifestParser";
import {
  findBundleOutputChunkForScript,
  getContentScriptLoaderFile,
  getRollupOutputFile,
  getServiceWorkerLoaderFile,
  isSingleHtmlFilename,
  outputChunkHasImports,
  parseManifestHtmlFile,
  pipe,
} from "./utils";
import type { OutputBundle } from "rollup";

interface ManifestV3ParseResult extends ParseResult {
  manifest: chrome.runtime.ManifestV3;
}

export default class ManifestV3 implements ManifestParser {
  async parseManifest(
    manifest: ManifestV3ParseResult["manifest"]
  ): Promise<ManifestV3ParseResult> {
    return pipe(
      this,
      {
        manifest,
        inputScripts: [],
        emitFiles: [],
      },
      this.#parseManifestHtmlFiles,
      this.#parseManifestContentScripts,
      this.#parseManifestBackgroundServiceWorker
    );
  }

  #parseManifestHtmlFiles(
    result: ManifestV3ParseResult
  ): ManifestV3ParseResult {
    const htmlFileNames: (string | undefined)[] = [
      result.manifest.action?.default_popup,
      result.manifest.options_ui?.page,
    ];

    (result.manifest.web_accessible_resources ?? []).forEach(({ resources }) =>
      resources.filter(isSingleHtmlFilename).forEach((html) => {
        htmlFileNames.push(html);
      })
    );

    htmlFileNames.forEach((htmlFileName) =>
      parseManifestHtmlFile(htmlFileName, result)
    );

    return result;
  }

  #parseManifestContentScripts(
    result: ManifestV3ParseResult
  ): ManifestV3ParseResult {
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

  #parseManifestBackgroundServiceWorker(
    result: ManifestV3ParseResult
  ): ManifestV3ParseResult {
    if (!result.manifest.background?.service_worker) {
      return result;
    }

    const serviceWorkerScript = result.manifest.background?.service_worker;

    const outputFile = getRollupOutputFile(serviceWorkerScript);

    result.inputScripts.push([outputFile, serviceWorkerScript]);

    result.manifest.background.type = "module";

    return result;
  }

  async parseOutputBundle(
    bundle: OutputBundle,
    manifest: ManifestV3ParseResult["manifest"]
  ): Promise<ManifestV3ParseResult> {
    let result: ManifestV3ParseResult = {
      inputScripts: [],
      emitFiles: [],
      manifest: manifest,
    };

    result = this.#parseBundleServiceWorker(result, bundle);
    result = this.#parseBundleContentScripts(result, bundle);

    return result;
  }

  #parseBundleServiceWorker(
    result: ManifestV3ParseResult,
    bundle: OutputBundle
  ): ManifestV3ParseResult {
    const serviceWorkerFileName = result.manifest.background?.service_worker;

    if (!serviceWorkerFileName) {
      return result;
    }

    const outputChunk = findBundleOutputChunkForScript(
      bundle,
      serviceWorkerFileName
    );

    if (!outputChunk) {
      throw new Error("Failed to build service worker");
    }

    const serviceWorkerLoader = getServiceWorkerLoaderFile(
      outputChunk.fileName
    );

    result.manifest.background!.service_worker = serviceWorkerLoader.fileName;

    result.emitFiles.push({
      type: "asset",
      fileName: serviceWorkerLoader.fileName,
      source: serviceWorkerLoader.source,
    });

    return result;
  }

  #parseBundleContentScripts(
    result: ManifestV3ParseResult,
    bundle: OutputBundle
  ): ManifestV3ParseResult {
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

        const resources = new Set<string>();

        resources.add(outputChunk.fileName);

        outputChunk.imports.forEach(resources.add, resources);
        outputChunk.dynamicImports.forEach(resources.add, resources);

        webAccessibleResources.add({
          resources: Array.from(resources),
          matches: script.matches!,
        });
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
