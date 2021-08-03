import type { Plugin, RollupOptions, EmittedFile } from "rollup";
import type { RollupWebExtensionOptions, WebExtensionManifest } from "../types";
import {
  addDynamicImportsToManifestContentScripts,
  parseManifestContentScripts,
  parseManifestHtmlFiles,
} from "./manifest";
import {
  getOptionsInputAsObject,
  addInputScriptsToOptionsInput,
} from "./rollup";

export default function webExtension(
  pluginOptions: RollupWebExtensionOptions
): Plugin {
  if (!pluginOptions.manifest) {
    throw new Error("Missing manifest definition");
  }

  let outputManifest: WebExtensionManifest = pluginOptions.manifest;
  let emitQueue: EmittedFile[] = [];

  return {
    name: "webExtension",

    options(options: RollupOptions) {
      options.input = getOptionsInputAsObject(options.input);

      const { inputScripts: contentScriptInputScripts } =
        parseManifestContentScripts(outputManifest);

      options.input = addInputScriptsToOptionsInput(
        options.input,
        contentScriptInputScripts
      );

      const { inputScripts: htmlInputScripts, emitFiles: htmlEmitFiles } =
        parseManifestHtmlFiles(outputManifest);

      options.input = addInputScriptsToOptionsInput(
        options.input,
        htmlInputScripts
      );

      emitQueue = emitQueue.concat(htmlEmitFiles);

      return options;
    },

    generateBundle(_, bundle) {
      const { emitFiles } = addDynamicImportsToManifestContentScripts(
        outputManifest,
        bundle,
        this.meta.watchMode
      );

      emitQueue.concat(emitFiles).forEach(this.emitFile);
      emitQueue = [];

      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(outputManifest, null, 2),
      });
    },
  };
}
