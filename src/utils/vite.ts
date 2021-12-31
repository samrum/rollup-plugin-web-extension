import MagicString from "magic-string";
import type { Manifest, ManifestChunk, ResolvedConfig } from "vite";
import { getContentScriptLoaderFile } from "./loader";

// Vite asset helper rewrites usages of import.meta.url to self.location for broader
//   browser support, but content scripts need to reference assets via import.meta.url
// This transform rewrites self.location back to import.meta.url
export function transformSelfLocationAssets(
  code: string,
  resolvedViteConfig: ResolvedConfig
) {
  if (code.includes("new URL") && code.includes(`self.location`)) {
    let updatedCode: MagicString | null = null;
    const selfLocationUrlPattern =
      /\bnew\s+URL\s*\(\s*('[^']+'|"[^"]+"|`[^`]+`)\s*,\s*self\.location\s*\)/g;

    let match: RegExpExecArray | null;
    while ((match = selfLocationUrlPattern.exec(code))) {
      const { 0: exp, index } = match;

      if (!updatedCode) updatedCode = new MagicString(code);

      updatedCode.overwrite(
        index,
        index + exp.length,
        exp.replace("self.location", "import.meta.url")
      );
    }

    if (updatedCode) {
      return {
        code: updatedCode.toString(),
        map: resolvedViteConfig.build.sourcemap
          ? updatedCode.generateMap({ hires: true })
          : null,
      };
    }
  }

  return null;
}

export function getWebAccessibleFilesForManifestChunk(
  viteManifest: Manifest,
  chunkId: string
): Set<string> {
  const files = new Set<string>();

  const manifestChunk = viteManifest[chunkId];
  if (!manifestChunk) {
    return files;
  }

  files.add(manifestChunk.file);

  manifestChunk.css?.forEach(files.add, files);
  manifestChunk.assets?.forEach(files.add, files);

  manifestChunk.imports?.forEach((chunkId) =>
    getWebAccessibleFilesForManifestChunk(viteManifest, chunkId).forEach(
      files.add,
      files
    )
  );

  manifestChunk.dynamicImports?.forEach((chunkId) =>
    getWebAccessibleFilesForManifestChunk(viteManifest, chunkId).forEach(
      files.add,
      files
    )
  );

  return files;
}

export function getContentScriptLoaderForManifestChunk(
  manifestChunk: ManifestChunk
): { fileName: string; source?: string } {
  if (!manifestChunk.imports?.length && !manifestChunk.dynamicImports?.length) {
    return {
      fileName: manifestChunk.file,
    };
  }

  return getContentScriptLoaderFile(manifestChunk.src!, manifestChunk.file);
}
