import type { Plugin } from "vite";

type WebExtensionManifest = chrome.runtime.Manifest;

interface RollupWebExtensionOptions {
  /**
   * The manifest file to use as a base for the generated extension
   */
  manifest: WebExtensionManifest;
}

/**
 * Build cross platform, module-based web extensions using rollup
 */
export default function webExtension(
  options?: RollupWebExtensionOptions
): Plugin;

// TODO: Have this automatically included on plugin usage
interface ImportMeta {
  CURRENT_CONTENT_SCRIPT_CSS_URL?: string;
}
