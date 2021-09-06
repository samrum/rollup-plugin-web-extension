import type { EmittedFile, OutputBundle } from "rollup";

export default interface ManifestParser {
  parseManifestContentScripts(): ParseResult;

  parseManifestHtmlFiles(): ParseResult;

  parseBundleForDynamicContentScripts(bundle: OutputBundle): ParseResult;

  getManifest(): chrome.runtime.Manifest;
}

export interface ParseResult {
  inputScripts: [string, string][];
  emitFiles: EmittedFile[];
}
