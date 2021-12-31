import type { EmittedFile } from "rollup";
import type { Manifest, Plugin, ResolvedConfig } from "vite";
import type { RollupWebExtensionOptions } from "../types";
import { addInputScriptsToOptionsInput } from "./utils/rollup";
import ManifestParser from "./manifestParser/manifestParser";
import ManifestParserFactory from "./manifestParser/manifestParserFactory";
import { getVirtualModule } from "./utils/virtualModule";
import contentScriptStyleHandler from "./middleware/contentScriptStyleHandler";
import {
  overrideManifestPlugin,
  transformSelfLocationAssets,
  updateConfigForExtensionSupport,
} from "./utils/vite";

export default function webExtension(
  pluginOptions: RollupWebExtensionOptions
): Plugin {
  if (!pluginOptions.manifest) {
    throw new Error("Missing manifest definition");
  }

  let inputManifest = pluginOptions.manifest;
  let viteConfig: ResolvedConfig;
  let emitQueue: EmittedFile[] = [];
  let manifestParser: ManifestParser<chrome.runtime.Manifest> | undefined;

  return {
    name: "webExtension",
    enforce: "post", // required to revert vite asset self.location transform to import.meta.url

    config(config) {
      return updateConfigForExtensionSupport(config);
    },

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig;

      overrideManifestPlugin({
        viteConfig,
        onManifestGenerated: async (
          manifestSource,
          pluginContext,
          outputBundle
        ) => {
          const { emitFiles, manifest } =
            await manifestParser!.parseViteManifest(
              JSON.parse(manifestSource) as Manifest,
              inputManifest,
              outputBundle
            );

          emitFiles.forEach(pluginContext.emitFile);

          pluginContext.emitFile({
            type: "asset",
            fileName: "manifest.json",
            source: JSON.stringify(manifest, null, 2),
          });
        },
      });
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

      const { inputScripts, emitFiles, manifest } =
        await manifestParser.parseManifest(inputManifest);

      options.input = addInputScriptsToOptionsInput(
        inputScripts,
        options.input
      );

      emitQueue = emitQueue.concat(emitFiles);

      inputManifest = manifest;

      return options;
    },

    buildStart() {
      emitQueue.forEach((file) => {
        this.emitFile(file);
        this.addWatchFile(file.fileName ?? file.name!);
      });
      emitQueue = [];
    },

    resolveId(id) {
      const module = getVirtualModule(id);

      return module ? id : null;
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
