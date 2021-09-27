import type { Plugin, RollupOptions, EmittedFile } from "rollup";
import type { RollupWebExtensionOptions } from "../types";
import { addInputScriptsToOptionsInput } from "./rollupUtils";
import ManifestV2 from "./manifestParser/manifestV2";
import ManifestV3 from "./manifestParser/manifestV3";
import ManifestParser from "./manifestParser/manifestParser";
import { getLoaderDirectory } from "./manifestParser/utils";

export default function webExtension(
  pluginOptions: RollupWebExtensionOptions
): Plugin {
  if (!pluginOptions.manifest) {
    throw new Error("Missing manifest definition");
  }

  let inputManifest: chrome.runtime.Manifest = pluginOptions.manifest;
  let outputManifest: chrome.runtime.Manifest;
  let emitQueue: EmittedFile[] = [];
  let manifestParser: ManifestParser<chrome.runtime.Manifest> | undefined;

  return {
    name: "webExtension",

    async options(options: RollupOptions) {
      if (!inputManifest.manifest_version) {
        throw new Error("Missing manifest_version in manifest");
      }

      outputManifest = JSON.parse(JSON.stringify(inputManifest));

      const manifestParserConfig = {
        isInWatchMode: this.meta.watchMode,
      };

      switch (outputManifest.manifest_version) {
        case 2:
          manifestParser = new ManifestV2(manifestParserConfig);
          break;
        case 3:
          manifestParser = new ManifestV3(manifestParserConfig);
          break;
      }

      if (!manifestParser) {
        throw new Error(
          `No parser available for manifest version ${outputManifest.manifest_version}`
        );
      }

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

        if (!file.fileName.startsWith(`${getLoaderDirectory()}/`)) {
          this.addWatchFile(file.fileName);
        }
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
