import type { Plugin, RollupOptions, EmittedFile } from "rollup";
import type { RollupWebExtensionOptions } from "../types";
import {
  getOptionsInputAsObject,
  addInputScriptsToOptionsInput,
} from "./rollup";
import ManifestV2 from "./parser/manifestV2";
import ManifestParser from "./parser/manifestParser";

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

  let manifestParser: ManifestParser | undefined;

  return {
    name: "webExtension",

    options(options: RollupOptions) {
      if (outputManifest.manifest_version === 2) {
        manifestParser = new ManifestV2(outputManifest, this.meta.watchMode);
      }

      if (!manifestParser) {
        throw new Error(
          `No parser available for manifest version ${outputManifest.manifest_version}`
        );
      }

      options.input = getOptionsInputAsObject(options.input);

      const { inputScripts: contentScriptInputScripts } =
        manifestParser.parseManifestContentScripts();

      options.input = addInputScriptsToOptionsInput(
        options.input,
        contentScriptInputScripts
      );

      const { inputScripts: htmlInputScripts, emitFiles: htmlEmitFiles } =
        manifestParser.parseManifestHtmlFiles();

      options.input = addInputScriptsToOptionsInput(
        options.input,
        htmlInputScripts
      );

      emitQueue = emitQueue.concat(htmlEmitFiles);

      return options;
    },

    generateBundle(_, bundle) {
      const { emitFiles } =
        manifestParser!.parseBundleForDynamicContentScripts(bundle);

      emitQueue.concat(emitFiles).forEach(this.emitFile);
      emitQueue = [];

      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(manifestParser!.getManifest(), null, 2),
      });
    },
  };
}
