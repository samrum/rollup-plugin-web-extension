import type { EmittedFile, OutputBundle } from "rollup";

export default interface ManifestParser<
  ManifestType extends chrome.runtime.Manifest
> {
  parseManifest(manifest: ManifestType): Promise<ParseResult<ManifestType>>;

  parseOutputBundle(
    bundle: OutputBundle,
    manifest: ManifestType
  ): Promise<ParseResult<ManifestType>>;
}

export interface ParseResult<ManifestType extends chrome.runtime.Manifest> {
  inputScripts: [string, string][];
  emitFiles: EmittedFile[];
  manifest: ManifestType;
}

export interface ManifestParserConfig {
  isInWatchMode: boolean;
}
