import type { Plugin } from "rollup";

type WebExtensionManifest = chrome.runtime.Manifest;

interface RollupWebExtensionOptions {
  /**
   * The manifest file to use as a base for the generated manifest
   */
  manifest: WebExtensionManifest;
}

/**
 * Build cross platform web extensions using rollup
 */
export default function webExtension(
  options?: RollupWebExtensionOptions
): Plugin;
