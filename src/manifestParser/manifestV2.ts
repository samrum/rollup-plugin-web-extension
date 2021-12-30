import { copy, emptyDir, readFileSync, writeFile } from "fs-extra";
import {
  getContentScriptLoaderFile,
  getScriptHtmlLoaderFile,
} from "../utils/loader";
import { setVirtualModule } from "../utils/virtualModule";
import ManifestParser, {
  ManifestParserConfig,
  ParseResult,
} from "./manifestParser";
import {
  parseManifestHtmlFile,
  pipe,
  isSingleHtmlFilename,
  getOutputFileName,
  updateContentSecurityPolicyForHmr,
  rewriteCssInBundleForManifestChunk,
} from "../utils/manifest";
import type { Manifest as ViteManifest } from "vite";
import { getWebAccessibleFilesForManifestChunk } from "../utils/vite";
import { OutputBundle } from "rollup";
import {
  getHmrServerOrigin,
  writeManifestContentScriptFiles,
  writeManifestHtmlFiles,
} from "../utils/devServer";

type Manifest = chrome.runtime.ManifestV2;
type ManifestParseResult = ParseResult<Manifest>;

export default class ManifestV2 implements ManifestParser<Manifest> {
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
      this.#parseManifestBackgroundScripts
    );
  }

  #parseManifestHtmlFiles(result: ManifestParseResult): ManifestParseResult {
    this.#getManifestFileNames(result.manifest).forEach((htmlFileName) =>
      parseManifestHtmlFile(htmlFileName, result)
    );

    return result;
  }

  #getManifestFileNames(manifest: Manifest): string[] {
    return [
      manifest.background?.page,
      manifest.browser_action?.default_popup,
      manifest.options_ui?.page,
      ...(manifest.web_accessible_resources ?? []).filter(isSingleHtmlFilename),
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
          source: readFileSync(cssFile, "utf-8"),
        });
      });
    });

    return result;
  }

  #parseManifestBackgroundScripts(
    result: ManifestParseResult
  ): ManifestParseResult {
    if (!result.manifest.background?.scripts) {
      return result;
    }

    const htmlLoaderFile = getScriptHtmlLoaderFile(
      "background",
      result.manifest.background.scripts.map((script) => {
        if (/^[\.\/]/.test(script)) {
          return script;
        }

        return `/${script}`;
      })
    );

    setVirtualModule(htmlLoaderFile.fileName, htmlLoaderFile.source);

    const outputFile = getOutputFileName(htmlLoaderFile.fileName);

    result.inputScripts.push([outputFile, htmlLoaderFile.fileName]);

    delete result.manifest.background.scripts;
    result.manifest.background.page = htmlLoaderFile.fileName;

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

    manifest.content_security_policy = updateContentSecurityPolicyForHmr(
      manifest.content_security_policy,
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

    return this.#parseBundleContentScripts(result, viteManifest, outputBundle);
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
        const manifestChunk = viteManifest[scriptFileName];
        if (!manifestChunk) {
          return;
        }

        rewriteCssInBundleForManifestChunk(manifestChunk, outputBundle);

        manifestChunk.css?.forEach(
          webAccessibleResources.add,
          webAccessibleResources
        );
        manifestChunk.assets?.forEach(
          webAccessibleResources.add,
          webAccessibleResources
        );

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
        ).forEach(webAccessibleResources.add, webAccessibleResources);
      });
    });

    if (webAccessibleResources.size > 0) {
      if (this.config.viteConfig.build.watch) {
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
