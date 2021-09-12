import { rollup } from "rollup";
import type { RollupOutput, RollupOptions } from "rollup";
import sucrase from "@rollup/plugin-sucrase";
import webExtension from "./../../src/index";
import { isOutputChunk } from "./../../src/rollup";

interface TestFixture<ManifestType> {
  inputManifest: Partial<ManifestType>;
  expectedManifest: Partial<ManifestType>;
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

async function validateFixture<ManifestType>(
  {
    inputManifest,
    expectedManifest,
    assetCode = {},
    chunkCode = {},
  }: TestFixture<ManifestType>,
  manifestVersion: 2 | 3
): Promise<void> {
  const baseManifest: chrome.runtime.Manifest = {
    version: "1.0.0",
    name: "Manifest Name",
    description: "Manifest Description",
    manifest_version: manifestVersion,
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

  // Number of output files should match expected output files defined in fixture
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
  [key: string]: TestFixture<chrome.runtime.ManifestV2>;
}) {
  Object.entries(fixtures).forEach(([testName, fixture]) => {
    test(testName, async () => {
      await validateFixture(fixture, 2);
    });
  });
}

export async function validateManifestV3Fixtures(fixtures: {
  [key: string]: TestFixture<chrome.runtime.ManifestV3>;
}) {
  Object.entries(fixtures).forEach(([testName, fixture]) => {
    // test(testName, async () => {
    //   await validateFixture(fixture, 3);
    // });
  });
}
