import { rollup } from "rollup";
import type { RollupOutput, RollupOptions } from "rollup";
import sucrase from "@rollup/plugin-sucrase";
import webExtension from "./../../src/index";
import { isOutputChunk } from "./../../src/rollup";

interface TestFixture {
  inputManifest: Partial<chrome.runtime.ManifestV2>;
  expectedManifest: Partial<chrome.runtime.ManifestV2>;
  assetCode?: { [entryAlias: string]: string };
  chunkCode?: { [entryAlias: string]: string };
}

async function rollupGenerate(
  manifest: chrome.runtime.Manifest
): Promise<RollupOutput> {
  const bundle = await rollup({
    plugins: [
      sucrase({
        exclude: ["node_modules/**"],
        transforms: ["typescript"],
      }),
      webExtension({
        manifest,
      }),
    ],
  });

  return bundle.generate({});
}

async function validateFixture(
  {
    inputManifest,
    expectedManifest,
    assetCode = {},
    chunkCode = {},
  }: TestFixture,
  rollupConfig: Partial<RollupOptions> = {}
): Promise<void> {
  const baseManifest: chrome.runtime.ManifestV2 = {
    version: "2.0.0",
    name: "Manifest Name",
    description: "Manifest Description",
    manifest_version: 2,
  };

  const { output } = await rollupGenerate({
    ...baseManifest,
    ...inputManifest,
  });

  assetCode = {
    "manifest.json": JSON.stringify(
      { ...baseManifest, ...expectedManifest },
      null,
      2
    ),
    ...assetCode,
  };

  expect(output.length).toEqual(
    Object.keys(chunkCode).length + Object.keys(assetCode).length
  );

  output.forEach((file) => {
    if (isOutputChunk(file)) {
      expect(chunkCode[file.fileName]).toEqual(file.code);
      delete chunkCode[file.fileName];
    } else {
      expect(assetCode[file.fileName]).toEqual(file.source);
      delete assetCode[file.fileName];
    }
  });

  expect(Object.keys(chunkCode)).toEqual([]);
  expect(Object.keys(assetCode)).toEqual([]);
}

export async function validateManifestV2Fixtures(fixtures: {
  [key: string]: TestFixture;
}) {
  Object.entries(fixtures).forEach(([testName, fixture]) => {
    test(testName, async () => {
      await validateFixture(fixture);
    });
  });
}
