import fs from "fs";
import path from "path";
import ManifestParser, { ParseResult } from "./manifestParser";
import {
  getContentScriptLoaderFile,
  getServiceWorkerLoaderFile,
  parseManifestHtmlFile,
  pipe,
} from "./utils";
import type { OutputBundle } from "rollup";
import { isOutputChunk } from "../rollupUtils";

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
      resources
        .filter((resource) => resource.endsWith(".html"))
        .forEach((html) => {
          htmlFileNames.push(html);
        })
    );

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

  #parseManifestContentScripts(
    result: ManifestV3ParseResult
  ): ManifestV3ParseResult {
    result.manifest.content_scripts?.forEach((script) => {
      script.js?.forEach((scriptFile) => {
        const { dir, name } = path.parse(scriptFile);
        const outputFile = dir ? `${dir}/${name}` : name;

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

    const { dir, name } = path.parse(serviceWorkerScript);
    const outputFile = dir ? `${dir}/${name}` : name;

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

    const [, bundleFile] =
      Object.entries(bundle).find(([, output]) => {
        if (!isOutputChunk(output)) {
          return false;
        }

        return output.facadeModuleId?.endsWith(serviceWorkerFileName);
      }) || [];

    if (!bundleFile) {
      throw new Error("Failed to build service worker");
    }

    const serviceWorkerLoader = getServiceWorkerLoaderFile(bundleFile.fileName);

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
        const [, bundleFile] =
          Object.entries(bundle).find(([, output]) => {
            if (!isOutputChunk(output)) {
              return false;
            }

            return output.facadeModuleId?.endsWith(scriptFileName);
          }) || [];

        if (!bundleFile || !isOutputChunk(bundleFile)) {
          return;
        }

        if (!bundleFile.imports.length && !bundleFile.dynamicImports.length) {
          script.js![index] = bundleFile.fileName;

          return;
        }

        const scriptLoaderFile = getContentScriptLoaderFile(
          bundleFile.fileName
        );

        script.js![index] = scriptLoaderFile.fileName;

        result.emitFiles.push({
          type: "asset",
          fileName: scriptLoaderFile.fileName,
          source: scriptLoaderFile.source,
        });

        const resources = new Set<string>();

        resources.add(bundleFile.fileName);

        bundleFile.imports.forEach(resources.add, resources);
        bundleFile.dynamicImports.forEach(resources.add, resources);

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
