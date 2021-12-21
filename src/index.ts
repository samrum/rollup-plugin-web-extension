import type { EmittedFile } from "rollup";
import type { Manifest, Plugin, ResolvedConfig, ViteDevServer } from "vite";
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

  let viteConfig: ResolvedConfig;

  const inputManifest: chrome.runtime.Manifest = pluginOptions.manifest;

  let outputManifest: chrome.runtime.Manifest;
  let emitQueue: EmittedFile[] = [];
  let manifestParser: ManifestParser | undefined;

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

      config.server.hmr.protocol = "ws";
      config.server.hmr.host = "localhost";

      return config;
    },

    configureServer(server) {
      server.middlewares.use(contentScriptStyleHandler);

      server.httpServer!.once("listening", () => {
        manifestParser!.writeServeBuild(
          outputManifest,
          server.config.server.port!
        );
      });
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
          outputManifest,
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

    async transform(code) {
      return transformSelfLocationAssets(code, viteConfig);
    },

    resolveImportMeta(prop, options) {
      if (prop === "CURRENT_CONTENT_SCRIPT_CSS_URL") {
        return `"${options.chunkId.replace(".js", ".css")}"`;
      }

      return null;
    },

    async options(options) {
      if (!inputManifest.manifest_version) {
        throw new Error("Missing manifest_version in manifest");
      }

      outputManifest = JSON.parse(JSON.stringify(inputManifest));

      manifestParser = ManifestParserFactory.getParser(
        outputManifest.manifest_version,
        {
          viteConfig,
        }
      );

      const { inputScripts, emitFiles, manifest } =
        await manifestParser.parseManifest(outputManifest);

      options.input = addInputScriptsToOptionsInput(
        inputScripts,
        options.input
      );

      emitQueue = emitQueue.concat(emitFiles);

      outputManifest = manifest;

      return options;
    },

    resolveId(id) {
      const module = getVirtualModule(id);
      if (module) return id;

      return null;
    },

    load(id) {
      return getVirtualModule(id);
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
  };
}
