import fs from "fs";
import path from "path";
import ManifestParser, {
  ManifestParserConfig,
  ParseResult,
} from "./manifestParser";
import { getScriptLoaderFile, parseManifestHtmlFile, pipe } from "./utils";
import type { OutputBundle } from "rollup";
import { isOutputChunk } from "../rollup";

type ManifestVersion = chrome.runtime.ManifestV3;
type ManifestParseResult = ParseResult<ManifestVersion>;

export default class ManifestV3 implements ManifestParser<ManifestVersion> {
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
      this.#parseManifestBackgroundServiceWorker
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

  #parseManifestBackgroundServiceWorker(
    result: ManifestParseResult
  ): ManifestParseResult {
    if (!result.manifest.background?.service_worker) {
      return result;
    }

    const serviceWorkerScript = result.manifest.background?.service_worker;

    const { name } = path.parse(serviceWorkerScript);

    result.inputScripts.push([name, serviceWorkerScript]);

    result.manifest.background.service_worker = `${name}.js`;

    return result;
  }

  #parseManifestHtmlFiles(result: ManifestParseResult): ManifestParseResult {
    const htmlFileNames: (string | undefined)[] = [
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
      // expose all js files in watch mode since manifest changes are not respected on web-ext automatic reload in some browsers (eg. Firefox)
      webAccessibleResources.add({
        resources: ["*.js"],
        matches: ["<all_urls>"],
      });
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

        const resources = new Set<string>();

        resources.add(scriptFileName);

        bundleFile.imports.forEach(resources.add, webAccessibleResources);
        bundleFile.dynamicImports.forEach(
          resources.add,
          webAccessibleResources
        );

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
