import path from "path";
import {
  copy,
  emptyDir,
  ensureDir,
  readFile,
  readFileSync,
  writeFile,
} from "fs-extra";
import {
  getContentScriptLoaderFile,
  getScriptHtmlLoaderFile,
} from "../utils/loader";
import { getVirtualModule, setVirtualModule } from "../utils/virtualModule";
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
} from "./utils";
import type { Manifest as ViteManifest } from "vite";
import { getWebAccessibleFilesForManifestChunk } from "../utils/vite";
import { OutputBundle } from "rollup";

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

  async writeServeBuild(
    manifest: Manifest,
    devServerPort: number
  ): Promise<void> {
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

      // update absolute paths
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

    manifest.content_security_policy = updateContentSecurityPolicyForHmr(
      manifest.content_security_policy,
      hmrServerOrigin
    );

    await writeFile(
      `${this.config.viteConfig.build.outDir}/manifest.json`,
      JSON.stringify(manifest, null, 2)
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

        if (manifestChunk.css?.length) {
          const outputChunk = outputBundle[manifestChunk.file];
          if (outputChunk.type === "chunk") {
            outputChunk.code = outputChunk.code.replace(
              manifestChunk.file.replace(".js", ".css"),
              manifestChunk.css[0]
            );
          }
        }

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
