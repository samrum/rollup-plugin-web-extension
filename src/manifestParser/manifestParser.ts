import type { EmittedFile, OutputBundle } from "rollup";
import type { ResolvedConfig } from "vite";

export default interface ManifestParser {
  parseManifest(manifest: chrome.runtime.Manifest): Promise<ParseResult>;

  parseOutputBundle(
    bundle: OutputBundle,
    manifest: chrome.runtime.Manifest
  ): Promise<ParseResult>;

  writeServeBuild(manifest: chrome.runtime.Manifest): void;
}

export interface ParseResult {
  inputScripts: [string, string][];
  emitFiles: EmittedFile[];
  manifest: chrome.runtime.Manifest;
}

export interface ManifestParserConfig {
  viteConfig: ResolvedConfig;
}
