import type { EmittedFile, OutputBundle } from "rollup";
import type { Manifest, ResolvedConfig } from "vite";

export default interface ManifestParser {
  parseManifest(manifest: chrome.runtime.Manifest): Promise<ParseResult>;

  writeServeBuild(
    manifest: chrome.runtime.Manifest,
    devServerPort: number
  ): void;

  parseViteManifest(
    viteManifest: Manifest,
    outputManifest: chrome.runtime.Manifest,
    outputBundle: OutputBundle
  ): Promise<ParseResult>;
}

export interface ParseResult {
  inputScripts: [string, string][];
  emitFiles: EmittedFile[];
  manifest: chrome.runtime.Manifest;
}

export interface ManifestParserConfig {
  viteConfig: ResolvedConfig;
}
