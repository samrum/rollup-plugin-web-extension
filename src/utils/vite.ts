import MagicString from "magic-string";
import { OutputBundle, PluginContext } from "rollup";
import type { Manifest, ResolvedConfig, UserConfig } from "vite";

export function updateConfigForExtensionSupport(
  config: UserConfig
): UserConfig {
  config.build ??= {};
  config.build.manifest = true;
  config.build.target = ["chrome64", "firefox89"]; // minimum browsers with import.meta.url and content script dynamic import

  config.build.rollupOptions ??= {};
  config.build.rollupOptions.input ??= undefined;

  config.server ??= {};

  if (config.server.hmr === true || !config.server.hmr) {
    config.server.hmr = {};
  }

  config.server.hmr.protocol = "ws"; // required for content script hmr to work on https
  config.server.hmr.host = "localhost";

  return config;
}

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
  chunkId: string,
  includeChunkFile = true
): Set<string> {
  const files = new Set<string>();

  const manifestChunk = viteManifest[chunkId];
  if (!manifestChunk) {
    return files;
  }

  if (includeChunkFile) {
    files.add(manifestChunk.file);
  }

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

export function overrideManifestPlugin({
  viteConfig,
  onManifestGenerated,
}: {
  viteConfig: ResolvedConfig;
  onManifestGenerated: (
    manifest: Manifest,
    pluginContext: PluginContext,
    outputBundle: OutputBundle
  ) => Promise<void>;
}) {
  const manifestPlugin = viteConfig.plugins.find(
    ({ name }) => name === "vite:manifest"
  )!;

  if (!manifestPlugin) {
    return;
  }

  const _generateBundle = manifestPlugin.generateBundle!;
  manifestPlugin.generateBundle = async function (...args) {
    let manifestSource = "";

    await _generateBundle.apply(
      {
        ...this,
        emitFile: (file) => {
          if (file.type === "asset" && file.fileName === "manifest.json") {
            manifestSource = file.source as string;

            return "manifestIgnoredId";
          }

          return this.emitFile(file);
        },
      },
      args
    );

    if (!manifestSource) {
      throw new Error("Failed to get vite generated manifest file!");
    }

    await onManifestGenerated(
      JSON.parse(manifestSource) as Manifest,
      this,
      args[1]
    );
  };
}
