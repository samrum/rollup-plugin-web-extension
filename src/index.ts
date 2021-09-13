import type { Plugin, RollupOptions, EmittedFile } from "rollup";
import type { RollupWebExtensionOptions } from "../types";
import { addInputScriptsToOptionsInput } from "./rollup";
import ManifestV2 from "./manifestParser/manifestV2";
import ManifestParser from "./manifestParser/manifestParser";

export default function webExtension(
  pluginOptions: RollupWebExtensionOptions
): Plugin {
  if (!pluginOptions.manifest) {
    throw new Error("Missing manifest definition");
  }

  let outputManifest: chrome.runtime.Manifest = pluginOptions.manifest;
  let emitQueue: EmittedFile[] = [];

  if (!outputManifest.manifest_version) {
    throw new Error("Missing manifest_version in manifest file");
  }

  let manifestParser: ManifestParser<chrome.runtime.Manifest> | undefined;

  return {
    name: "webExtension",

    async options(options: RollupOptions) {
      if (outputManifest.manifest_version === 2) {
        manifestParser = new ManifestV2(this.meta.watchMode);
      }

      if (!manifestParser) {
        throw new Error(
          `No parser available for manifest version ${outputManifest.manifest_version}`
        );
      }

      const { inputScripts, emitFiles, manifest } =
        await manifestParser.parseManifest(outputManifest);

      options.input = addInputScriptsToOptionsInput(
        options.input,
        inputScripts
      );

      emitQueue = emitQueue.concat(emitFiles);

      outputManifest = manifest;

      return options;
    },

    async generateBundle(_, bundle) {
      const { emitFiles, manifest } = await manifestParser!.parseOutputBundle(
        bundle,
        outputManifest
      );

      emitQueue.concat(emitFiles).forEach(this.emitFile);
      emitQueue = [];

      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(manifest, null, 2),
      });
    },
  };
}
