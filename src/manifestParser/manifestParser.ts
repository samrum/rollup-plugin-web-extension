import type { EmittedFile, OutputBundle } from "rollup";
import type { Manifest as ViteManifest, ResolvedConfig } from "vite";

export default interface ManifestParser<
  Manifest extends chrome.runtime.Manifest
> {
  // Pull files to emit and files to pass on to vite for processing from input manifest
  parseManifest(manifest: Manifest): Promise<ParseResult<Manifest>>;

  // Write base files needed for the extension to function, update imports to pull from dev server
  writeServeBuild(manifest: Manifest, devServerPort: number): Promise<void>;

  // Use vite manifest file to do things like add content script loaders, update extension manifest filenames
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
