import type { EmittedFile } from "rollup";
import type { Manifest, Plugin, ResolvedConfig } from "vite";
import type { RollupWebExtensionOptions } from "../types";
import { addInputScriptsToOptionsInput } from "./utils/rollup";
import ManifestParser from "./manifestParser/manifestParser";
import ManifestParserFactory from "./manifestParser/manifestParserFactory";
import { getVirtualModule } from "./utils/virtualModule";
import contentScriptStyleHandler from "./middleware/contentScriptStyleHandler";
import { transformSelfLocationAssets } from "./utils/vite";

export default function webExtension(
  pluginOptions: RollupWebExtensionOptions
): Plugin {
  if (!pluginOptions.manifest) {
    throw new Error("Missing manifest definition");
  }

  const inputManifest: chrome.runtime.Manifest = pluginOptions.manifest;

  let viteConfig: ResolvedConfig;
  let emitQueue: EmittedFile[] = [];
  let manifestParser: ManifestParser<chrome.runtime.Manifest> | undefined;

  return {
    name: "webExtension",
    enforce: "post", // required to revert vite asset self.location transform to import.meta.url

    config: (config) => {
      config.build ??= {};
      config.build.manifest = true;
      config.build.target = ["chrome64", "firefox89"];

      config.build.rollupOptions ??= {};
      config.build.rollupOptions.input ??= undefined;

      config.server ??= {};

      if (config.server.hmr === true || !config.server.hmr) {
        config.server.hmr = {};
      }

      config.server.hmr.protocol = "ws"; // required for content script hmr to work on https
      config.server.hmr.host = "localhost";

      return config;
    },

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig;

      const manifestPlugin = resolvedConfig.plugins.find(
        ({ name }) => name === "vite:manifest"
      )!;

      if (!manifestPlugin) {
        return;
      }

      const generateBundle = manifestPlugin.generateBundle!;
      manifestPlugin.generateBundle = async function (...args) {
        let manifestSource = "";

        await generateBundle.apply(
          {
            ...this,
            emitFile: (file) => {
              if (file.type === "asset" && file.fileName === "manifest.json") {
                manifestSource = file.source as string;

                return "manifestIgnoredId";
              }

              return this.emitFile(file);
            },
          },
          args
        );

        if (!manifestSource) {
          throw new Error("Failed to get vite generated manifest file!");
        }

        const { emitFiles, manifest } = await manifestParser!.parseViteManifest(
          JSON.parse(manifestSource) as Manifest,
          inputManifest,
          args[1]
        );

        emitFiles.forEach(this.emitFile);

        this.emitFile({
          type: "asset",
          fileName: "manifest.json",
          source: JSON.stringify(manifest, null, 2),
        });
      };
    },

    configureServer(server) {
      server.middlewares.use(contentScriptStyleHandler);

      server.httpServer!.once("listening", () => {
        manifestParser!.writeServeBuild(
          inputManifest,
          server.config.server.port!
        );
      });
    },

    async options(options) {
      manifestParser = ManifestParserFactory.getParser(
        inputManifest.manifest_version,
        {
          viteConfig,
        }
      );

      const { inputScripts, emitFiles } = await manifestParser.parseManifest(
        inputManifest
      );

      options.input = addInputScriptsToOptionsInput(
        inputScripts,
        options.input
      );

      emitQueue = emitQueue.concat(emitFiles);

      return options;
    },

    buildStart() {
      emitQueue.forEach((file) => {
        if (!file.fileName) {
          return;
        }

        this.emitFile(file);
        this.addWatchFile(file.fileName);
      });
      emitQueue = [];
    },

    resolveId(id) {
      const module = getVirtualModule(id);
      if (module) return id;

      return null;
    },

    load(id) {
      return getVirtualModule(id);
    },

    transform(code) {
      return transformSelfLocationAssets(code, viteConfig);
    },

    resolveImportMeta(prop, options) {
      if (prop === "CURRENT_CONTENT_SCRIPT_CSS_URL") {
        return `"${options.chunkId.replace(".js", ".css")}"`;
      }

      return null;
    },
  };
}
