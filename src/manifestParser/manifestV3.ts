import fs from "fs";
import { copy, emptyDir, writeFile } from "fs-extra";
import ManifestParser, {
  ManifestParserConfig,
  ParseResult,
} from "./manifestParser";
import {
  getOutputFileName,
  isSingleHtmlFilename,
  parseManifestHtmlFile,
  pipe,
  rewriteCssInBundleForManifestChunk,
  updateContentSecurityPolicyForHmr,
} from "../utils/manifest";
import type { OutputBundle } from "rollup";
import {
  getContentScriptLoaderFile,
  getServiceWorkerLoaderFile,
} from "../utils/loader";
import { Manifest as ViteManifest } from "vite";
import { getWebAccessibleFilesForManifestChunk } from "../utils/vite";
import {
  getHmrServerOrigin,
  writeManifestContentScriptFiles,
  writeManifestHtmlFiles,
  writeManifestServiceWorkerFiles,
} from "../utils/devServer";

type Manifest = chrome.runtime.ManifestV3;
type ManifestParseResult = ParseResult<Manifest>;

export default class ManifestV3 implements ManifestParser<Manifest> {
  constructor(private config: ManifestParserConfig) {}

  async parseManifest(manifest: Manifest): Promise<ManifestParseResult> {
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

  #parseManifestHtmlFiles(result: ManifestParseResult): ManifestParseResult {
    const htmlFileNames: string[] = this.#getManifestFileNames(result.manifest);

    htmlFileNames.forEach((htmlFileName) =>
      parseManifestHtmlFile(htmlFileName, result)
    );

    return result;
  }

  #getManifestFileNames(manifest: Manifest): string[] {
    const webAccessibleResourcesHtmlFileNames: string[] = [];

    (manifest.web_accessible_resources ?? []).forEach(({ resources }) =>
      resources.filter(isSingleHtmlFilename).forEach((html) => {
        webAccessibleResourcesHtmlFileNames.push(html);
      })
    );

    return [
      manifest.action?.default_popup,
      manifest.options_ui?.page,
      ...webAccessibleResourcesHtmlFileNames,
    ].filter((fileName): fileName is string => typeof fileName === "string");
  }

  #parseManifestContentScripts(
    result: ManifestParseResult
  ): ManifestParseResult {
    result.manifest.content_scripts?.forEach((script) => {
      script.js?.forEach((scriptFile) => {
        const outputFile = getOutputFileName(scriptFile);

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
    result: ManifestParseResult
  ): ManifestParseResult {
    if (!result.manifest.background?.service_worker) {
      return result;
    }

    const serviceWorkerScript = result.manifest.background?.service_worker;

    const outputFile = getOutputFileName(serviceWorkerScript);

    result.inputScripts.push([outputFile, serviceWorkerScript]);

    result.manifest.background.type = "module";

    return result;
  }

  async writeServeBuild(
    manifest: Manifest,
    devServerPort: number
  ): Promise<void> {
    const hmrServerOrigin = getHmrServerOrigin(this.config, devServerPort);

    const outDir = this.config.viteConfig.build.outDir;

    await emptyDir(outDir);
    copy("public", outDir);

    await writeManifestHtmlFiles(
      this.#getManifestFileNames(manifest),
      hmrServerOrigin,
      outDir
    );

    await writeManifestContentScriptFiles(manifest, hmrServerOrigin, outDir);

    await writeManifestServiceWorkerFiles(manifest, hmrServerOrigin, outDir);

    manifest.content_security_policy ??= {};

    manifest.content_security_policy.extension_pages =
      updateContentSecurityPolicyForHmr(
        manifest.content_security_policy.extension_pages,
        hmrServerOrigin
      );

    await writeFile(
      `${outDir}/manifest.json`,
      JSON.stringify(manifest, null, 2)
    );
  }

  async parseViteManifest(
    viteManifest: ViteManifest,
    outputManifest: Manifest,
    outputBundle: OutputBundle
  ): Promise<ManifestParseResult> {
    let result: ManifestParseResult = {
      inputScripts: [],
      emitFiles: [],
      manifest: outputManifest,
    };

    result = this.#parseBundleServiceWorker(result, viteManifest);
    result = this.#parseBundleContentScripts(
      result,
      viteManifest,
      outputBundle
    );

    return result;
  }

  #parseBundleServiceWorker(
    result: ManifestParseResult,
    viteManifest: ViteManifest
  ): ManifestParseResult {
    const serviceWorkerFileName = result.manifest.background?.service_worker;

    if (!serviceWorkerFileName) {
      return result;
    }

    const manifestChunk = viteManifest[serviceWorkerFileName];
    if (!manifestChunk) {
      throw new Error("Failed to build service worker");
    }

    const serviceWorkerLoader = getServiceWorkerLoaderFile(manifestChunk.file);

    result.manifest.background!.service_worker = serviceWorkerLoader.fileName;

    result.emitFiles.push({
      type: "asset",
      fileName: serviceWorkerLoader.fileName,
      source: serviceWorkerLoader.source,
    });

    return result;
  }

  #parseBundleContentScripts(
    result: ManifestParseResult,
    viteManifest: ViteManifest,
    outputBundle: OutputBundle
  ): ManifestParseResult {
    const webAccessibleResources = new Set(
      result.manifest.web_accessible_resources ?? []
    );

    result.manifest.content_scripts?.forEach((script) => {
      script.js?.forEach((scriptFileName, index) => {
        const resources = new Set<string>();

        const manifestChunk = viteManifest[scriptFileName];
        if (!manifestChunk) {
          return;
        }

        rewriteCssInBundleForManifestChunk(manifestChunk, outputBundle);

        manifestChunk.css?.forEach(resources.add, resources);
        manifestChunk.assets?.forEach(resources.add, resources);

        if (
          !manifestChunk.imports?.length &&
          !manifestChunk.dynamicImports?.length
        ) {
          script.js![index] = manifestChunk.file;

          return;
        }

        const scriptLoaderFile = getContentScriptLoaderFile(
          scriptFileName,
          manifestChunk.file
        );

        script.js![index] = scriptLoaderFile.fileName;

        result.emitFiles.push({
          type: "asset",
          fileName: scriptLoaderFile.fileName,
          source: scriptLoaderFile.source,
        });

        getWebAccessibleFilesForManifestChunk(
          viteManifest,
          scriptFileName
        ).forEach(resources.add, resources);

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
