import type { EmittedFile, OutputBundle } from "rollup";

export default interface ManifestParser<ManifestType> {
  parseManifest(manifest: ManifestType): Promise<ParseResult<ManifestType>>;

  parseOutputBundle(
    bundle: OutputBundle,
    manifest: ManifestType
  ): Promise<ParseResult<ManifestType>>;
}

export interface ParseResult<ManifestType> {
  inputScripts: [string, string][];
  emitFiles: EmittedFile[];
  manifest: ManifestType;
}
