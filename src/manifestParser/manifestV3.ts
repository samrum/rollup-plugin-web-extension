import fs from "fs";
import path from "path";
import ManifestParser, {
  ManifestParserConfig,
  ParseResult,
} from "./manifestParser";
import { getScriptLoaderFile, parseManifestHtmlFile, pipe } from "./utils";
import type { OutputBundle } from "rollup";
import { isOutputChunk } from "../rollupUtils";

interface ManifestV3ParseResult extends ParseResult {
  manifest: chrome.runtime.ManifestV3;
}

export default class ManifestV3 implements ManifestParser {
  constructor(private config: ManifestParserConfig) {}

  async parseManifest(
    manifest: ManifestV3ParseResult["manifest"]
  ): Promise<ManifestV3ParseResult> {
    return pipe(
      this,
      {
        inputScripts: [],
        emitFiles: [],
        manifest: manifest,
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

  #parseManifestBackgroundServiceWorker(
    result: ManifestV3ParseResult
  ): ManifestV3ParseResult {
    if (!result.manifest.background?.service_worker) {
      return result;
    }

    const serviceWorkerScript = result.manifest.background?.service_worker;

    const { name } = path.parse(serviceWorkerScript);

    result.inputScripts.push([name, serviceWorkerScript]);

    result.manifest.background.service_worker = `${name}.js`;

    return result;
  }

  async parseOutputBundle(
    bundle: OutputBundle,
    manifest: ManifestV3ParseResult["manifest"]
  ): Promise<ManifestV3ParseResult> {
    let result = {
      inputScripts: [],
      emitFiles: [],
      manifest: manifest,
    };

    return this.#parseBundleForDynamicContentScripts(result, bundle);
  }

  #parseBundleForDynamicContentScripts(
    result: ManifestV3ParseResult,
    bundle: OutputBundle
  ): ManifestV3ParseResult {
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

        const resources = new Set<string>();

        resources.add(scriptFileName);

        bundleFile.imports.forEach(resources.add, resources);
        bundleFile.dynamicImports.forEach(resources.add, resources);

        webAccessibleResources.add({
          resources: Array.from(resources),
          matches: script.matches!,
        });
      });
    });

    if (webAccessibleResources.size > 0) {
      // Commented out because web-ext doesn't work with manifest v3 service workers yet
      // if (this.config.isInWatchMode) {
      //   // expose all js files in watch mode since manifest changes are not respected on web-ext automatic reload in some browsers (eg. Firefox)
      //   webAccessibleResources.add({
      //     resources: ["*.js"],
      //     matches: ["<all_urls>"],
      //   });
      // }

      result.manifest.web_accessible_resources = Array.from(
        webAccessibleResources
      );
    }

    return result;
  }
}
