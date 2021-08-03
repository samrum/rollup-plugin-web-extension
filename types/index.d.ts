import type { Plugin } from "rollup";

interface WebExtensionManifest {
  version: string;
  name: string;
  description?: string;
  background?: {
    page?: string;
    persistent?: boolean;
  };
  content_scripts?: {
    js?: string[];
    css?: string[];
    matches: string[];
  }[];
  browser_action?: {
    default_popup?: string;
  };
  web_accessible_resources?: string[];
  manifest_version: number;
}

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
