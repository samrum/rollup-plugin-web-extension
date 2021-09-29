import type { EmittedFile, OutputBundle } from "rollup";

export default interface ManifestParser {
  parseManifest(manifest: chrome.runtime.Manifest): Promise<ParseResult>;

  parseOutputBundle(
    bundle: OutputBundle,
    manifest: chrome.runtime.Manifest
  ): Promise<ParseResult>;
}

export interface ParseResult {
  inputScripts: [string, string][];
  emitFiles: EmittedFile[];
  manifest: chrome.runtime.Manifest;
}

export interface ManifestParserConfig {
  isInWatchMode: boolean;
}
