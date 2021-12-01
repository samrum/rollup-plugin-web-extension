import type { EmittedFile } from "rollup";
import type { Plugin, ResolvedConfig } from "vite";
import type { RollupWebExtensionOptions } from "../types";
import { addInputScriptsToOptionsInput } from "./utils/rollup";
import ManifestParser from "./manifestParser/manifestParser";
import ManifestParserFactory from "./manifestParser/manifestParserFactory";
import { getVirtualModule } from "./utils/virtualModule";

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

    config: () => ({
      build: {
        rollupOptions: {
          input: undefined,
        },
      },
      server: {
        hmr: {
          protocol: "ws", // required for content script hmr to work on https
          host: "localhost",
        },
      },
    }),

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig;
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
      if (viteConfig.command === "serve") {
        manifestParser!.writeServeBuild(outputManifest);
      }

      emitQueue.forEach((file) => {
        if (!file.fileName) {
          return;
        }

        this.emitFile(file);
        this.addWatchFile(file.fileName);
      });
      emitQueue = [];
    },

    async generateBundle(_options, bundle) {
      const { emitFiles, manifest } = await manifestParser!.parseOutputBundle(
        bundle,
        outputManifest
      );

      emitFiles.forEach(this.emitFile);

      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(manifest, null, 2),
      });
    },
  };
}
