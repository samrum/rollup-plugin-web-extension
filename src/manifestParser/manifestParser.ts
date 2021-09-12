import type { EmittedFile, OutputBundle } from "rollup";

export default interface ManifestParser {
  parseManifest(): ParseResult;

  parseBundleForDynamicContentScripts(bundle: OutputBundle): ParseResult;

  getManifest(): chrome.runtime.Manifest;
}

export interface ParseResult {
  inputScripts: [string, string][];
  emitFiles: EmittedFile[];
}
