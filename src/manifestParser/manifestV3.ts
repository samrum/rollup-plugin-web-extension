import fs from "fs";
import path from "path";
import { copy, emptyDir, ensureDir, readFile, writeFile } from "fs-extra";
import ManifestParser, {
  ManifestParserConfig,
  ParseResult,
} from "./manifestParser";
import {
  getOutputFileName,
  isSingleHtmlFilename,
  parseManifestHtmlFile,
  pipe,
  updateContentSecurityPolicyForHmr,
} from "./utils";
import { getVirtualModule } from "../utils/virtualModule";
import type { OutputBundle } from "rollup";
import {
  getContentScriptLoaderFile,
  getServiceWorkerLoaderFile,
} from "../utils/loader";
import { Manifest } from "vite";
import { getWebAccessibleFilesForManifestChunk } from "../utils/vite";

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

  async writeServeBuild(
    manifest: chrome.runtime.ManifestV3,
    devServerPort: number
  ) {
    await emptyDir(this.config.viteConfig.build.outDir);
    copy("public", this.config.viteConfig.build.outDir);

    if (typeof this.config.viteConfig.server.hmr! === "boolean") {
      throw new Error("Vite HMR is misconfigured");
    }

    const hmrServerOrigin = `http://${
      this.config.viteConfig.server.hmr!.host
    }:${devServerPort}`;

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

    manifest.content_security_policy ??= {};

    manifest.content_security_policy.extension_pages =
      updateContentSecurityPolicyForHmr(
        manifest.content_security_policy.extension_pages,
        hmrServerOrigin
      );

    await writeFile(
      `${this.config.viteConfig.build.outDir}/manifest.json`,
      JSON.stringify(manifest, null, 2)
    );
  }

  async parseViteManifest(
    viteManifest: Manifest,
    outputManifest: ManifestV3ParseResult["manifest"],
    outputBundle: OutputBundle
  ): Promise<ManifestV3ParseResult> {
    let result: ManifestV3ParseResult = {
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
    result: ManifestV3ParseResult,
    viteManifest: Manifest
  ): ManifestV3ParseResult {
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
    result: ManifestV3ParseResult,
    viteManifest: Manifest,
    outputBundle: OutputBundle
  ): ManifestV3ParseResult {
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

        if (manifestChunk.css?.length) {
          const outputChunk = outputBundle[manifestChunk.file];
          if (outputChunk.type === "chunk") {
            outputChunk.code = outputChunk.code.replace(
              manifestChunk.file.replace(".js", ".css"),
              manifestChunk.css[0]
            );
          }
        }

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
