import type { Plugin, RollupOptions, EmittedFile } from "rollup";
import type { RollupWebExtensionOptions } from "../types";
import { addInputScriptsToOptionsInput } from "./rollupUtils";
import ManifestParser from "./manifestParser/manifestParser";
import ManifestParserFactory from "./manifestParser/manifestParserFactory";

export default function webExtension(
  pluginOptions: RollupWebExtensionOptions
): Plugin {
  if (!pluginOptions.manifest) {
    throw new Error("Missing manifest definition");
  }

  const inputManifest: chrome.runtime.Manifest = pluginOptions.manifest;

  let outputManifest: chrome.runtime.Manifest;
  let emitQueue: EmittedFile[] = [];
  let manifestParser: ManifestParser | undefined;

  return {
    name: "webExtension",

    async options(options: RollupOptions) {
      if (!inputManifest.manifest_version) {
        throw new Error("Missing manifest_version in manifest");
      }

      outputManifest = JSON.parse(JSON.stringify(inputManifest));

      manifestParser = ManifestParserFactory.getParser(
        outputManifest.manifest_version,
        {
          isInWatchMode: this.meta.watchMode,
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

    async generateBundle(_, bundle) {
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
