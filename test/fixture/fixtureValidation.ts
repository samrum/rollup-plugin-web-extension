import { rollup } from "rollup";
import type { RollupOutput } from "rollup";
import sucrase from "@rollup/plugin-sucrase";
import webExtension from "../../src/index";
import { isOutputChunk } from "../../src/rollupUtils";

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

async function validateFixture<ManifestType extends chrome.runtime.Manifest>(
  {
    inputManifest,
    expectedManifest,
    assetCode = {},
    chunkCode = {},
  }: TestFixture<ManifestType>,
  manifestVersion: ManifestType["manifest_version"]
): Promise<void> {
  const baseManifest: chrome.runtime.Manifest = {
    version: "1.0.0",
    name: "Manifest Name",
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

  const numberOfOutputFiles = output.length;
  const numberOfExpectedFiles =
    Object.keys(chunkCode).length + Object.keys(assetCode).length;

  output.forEach((file) => {
    if (isOutputChunk(file)) {
      if (!chunkCode[file.fileName]) {
        throw new Error(
          `Missing expected output chunk definition for: ${file.fileName}`
        );
      }

      expect(file.code).toEqual(chunkCode[file.fileName]);
      delete chunkCode[file.fileName];
    } else {
      if (!assetCode[file.fileName]) {
        throw new Error(
          `Missing expected output asset definition for: ${file.fileName}`
        );
      }

      expect(file.source).toEqual(assetCode[file.fileName]);
      delete assetCode[file.fileName];
    }
  });

  expect(Object.keys(chunkCode)).toEqual([]);
  expect(Object.keys(assetCode)).toEqual([]);

  // Number of output files should match expected output files defined in fixture
  expect(numberOfOutputFiles).toEqual(numberOfExpectedFiles);
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
    test(testName, async () => {
      await validateFixture(fixture, 3);
    });
  });
}
