import type { EmittedFile, OutputBundle } from "rollup";
import type { Manifest as ViteManifest, ResolvedConfig } from "vite";

export default interface ManifestParser<
  Manifest extends chrome.runtime.Manifest
> {
  parseManifest(manifest: Manifest): Promise<ParseResult<Manifest>>;

  writeServeBuild(manifest: Manifest, devServerPort: number): Promise<void>;

  parseViteManifest(
    viteManifest: ViteManifest,
    outputManifest: Manifest,
    outputBundle: OutputBundle
  ): Promise<ParseResult<Manifest>>;
}

export interface ParseResult<Manifest extends chrome.runtime.Manifest> {
  inputScripts: [string, string][];
  emitFiles: EmittedFile[];
  manifest: Manifest;
}

export interface ManifestParserConfig {
  viteConfig: ResolvedConfig;
}
