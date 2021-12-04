import fs from "fs";
import path from "path";
import { copy, emptyDir, ensureDir, readFile, writeFile } from "fs-extra";
import ManifestParser, {
  ManifestParserConfig,
  ParseResult,
} from "./manifestParser";
import {
  findBundleOutputChunkForScript,
  getCssAssetForChunk,
  getOutputFileName,
  isSingleHtmlFilename,
  outputChunkHasImports,
  parseManifestHtmlFile,
  pipe,
} from "./utils";
import { getVirtualModule } from "../utils/virtualModule";
import type { OutputBundle } from "rollup";
import {
  getContentScriptLoaderFile,
  getServiceWorkerLoaderFile,
} from "../utils/loader";

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
    const htmlFileNames: string[] = this.#getManifestFileNames(result.manifest);

    htmlFileNames.forEach((htmlFileName) =>
      parseManifestHtmlFile(htmlFileName, result)
    );

    return result;
  }

  #getManifestFileNames(manifest: chrome.runtime.ManifestV3): string[] {
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
    result: ManifestV3ParseResult
  ): ManifestV3ParseResult {
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
    result: ManifestV3ParseResult
  ): ManifestV3ParseResult {
    if (!result.manifest.background?.service_worker) {
      return result;
    }

    const serviceWorkerScript = result.manifest.background?.service_worker;

    const outputFile = getOutputFileName(serviceWorkerScript);

    result.inputScripts.push([outputFile, serviceWorkerScript]);

    result.manifest.background.type = "module";

    return result;
  }

  async writeServeBuild(manifest: chrome.runtime.ManifestV3) {
    await emptyDir(this.config.viteConfig.build.outDir);
    copy("public", this.config.viteConfig.build.outDir);

    if (typeof this.config.viteConfig.server.hmr! === "boolean") {
      throw new Error("Vite HMR is misconfigured");
    }

    const hmrServerOrigin = `http://${
      this.config.viteConfig.server.hmr!.host
    }:${this.config.viteConfig.server.port}`;

    for (const fileName of this.#getManifestFileNames(manifest)) {
      let content =
        getVirtualModule(fileName) ??
        (await readFile(fileName, {
          encoding: "utf-8",
        }));

      // update root paths
      content = content.replace('src="/', `src="${hmrServerOrigin}/`);

      // update relative paths
      const inputFileDir = path.dirname(fileName);
      content = content.replace(
        'src="./',
        `src="${hmrServerOrigin}/${inputFileDir ? `${inputFileDir}/` : ""}`
      );

      const outFile = `${this.config.viteConfig.build.outDir}/${fileName}`;

      const outFileDir = path.dirname(outFile);

      await ensureDir(outFileDir);

      await writeFile(outFile, content);
    }

    if (manifest.background?.service_worker) {
      const fileName = manifest.background?.service_worker;

      const serviceWorkerLoader = getServiceWorkerLoaderFile(
        `${hmrServerOrigin}/${fileName}`
      );

      manifest.background.service_worker = serviceWorkerLoader.fileName;

      const outFile = `${this.config.viteConfig.build.outDir}/${serviceWorkerLoader.fileName}`;

      const outFileDir = path.dirname(outFile);

      await ensureDir(outFileDir);

      await writeFile(outFile, serviceWorkerLoader.source);
    }

    if (manifest.content_scripts) {
      for (const [
        contentScriptIndex,
        script,
      ] of manifest.content_scripts.entries()) {
        if (!script.js) {
          continue;
        }

        for (const [scriptJsIndex, fileName] of script.js.entries()) {
          const outputFileName = getOutputFileName(fileName);

          const scriptLoaderFile = getContentScriptLoaderFile(
            outputFileName,
            `${hmrServerOrigin}/${fileName}`
          );

          manifest.content_scripts[contentScriptIndex].js![scriptJsIndex] =
            scriptLoaderFile.fileName;

          const outFile = `${this.config.viteConfig.build.outDir}/${scriptLoaderFile.fileName}`;

          const outFileDir = path.dirname(outFile);

          await ensureDir(outFileDir);

          await writeFile(outFile, scriptLoaderFile.source);
        }
      }
    }

    await writeFile(
      `${this.config.viteConfig.build.outDir}/manifest.json`,
      JSON.stringify(manifest, null, 2)
    );
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
          scriptFileName,
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

        const cssAsset = getCssAssetForChunk(bundle, outputChunk);
        if (cssAsset) {
          outputChunk.code = outputChunk.code.replace(
            cssAsset.name!,
            cssAsset.fileName
          );

          resources.add(cssAsset.fileName);
        }

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
