import { rollup } from "rollup";
import type { RollupOutput, RollupOptions } from "rollup";
import sucrase from "@rollup/plugin-sucrase";
import webExtension from "./../src/index";
import { isOutputChunk } from "./../src/rollup";
import type { WebExtensionManifest } from "./../types/index";
import * as JAVASCRIPT_CONTENT_WITH_DYNAMIC_IMPORT from "./fixture/index/javascript/contentWithDynamicImport";
import * as JAVASCRIPT_CONTENT_WITH_CHUNKED_IMPORT from "./fixture/index/javascript/contentWithChunkedImport";
import * as JAVASCRIPT_CONTENT_WITH_UNCHUNKED_IMPORT from "./fixture/index/javascript/contentWithUnchunkedImport";
import * as JAVASCRIPT_CONTENT_WITH_NO_IMPORTS from "./fixture/index/javascript/contentWithNoImports";
import * as TYPESCRIPT_CONTENT_WITH_NO_IMPORTS from "./fixture/index/typescript/contentWithNoImports";

function getManifest(
  testProperties: Partial<WebExtensionManifest> = {},
  asJson = false
): WebExtensionManifest | string {
  const manifest = {
    version: "2.0.0",
    name: "Manifest Name",
    description: "Manifest Description",
    manifest_version: 2,
    ...testProperties,
  };

  if (asJson) {
    return JSON.stringify(manifest, null, 2);
  }

  return manifest;
}

async function rollupGenerate(
  manifest: WebExtensionManifest,
  rollupOptions: Partial<RollupOptions>
): Promise<RollupOutput> {
  const bundle = await rollup({
    ...rollupOptions,
    plugins: [
      ...(rollupOptions.plugins ?? []),
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
  }: {
    inputManifest: Partial<WebExtensionManifest>;
    expectedManifest: Partial<WebExtensionManifest>;
    assetCode?: { [entryAlias: string]: string };
    chunkCode?: { [entryAlias: string]: string };
  },
  rollupConfig: Partial<RollupOptions> = {}
): Promise<void> {
  const { output } = await rollupGenerate(
    getManifest(inputManifest) as WebExtensionManifest,
    rollupConfig
  );

  assetCode = {
    "manifest.json": getManifest(expectedManifest, true) as string,
    ...assetCode,
  };

  expect(output.length).toEqual(
    Object.keys(chunkCode).length + Object.keys(assetCode).length
  );

  output.forEach((file) => {
    if (isOutputChunk(file)) {
      expect(file.code).toEqual(chunkCode[file.fileName]);
      delete chunkCode[file.fileName];
    } else {
      expect(file.source).toEqual(assetCode[file.fileName]);
      delete assetCode[file.fileName];
    }
  });

  expect(Object.keys(chunkCode).length).toEqual(0);
  expect(Object.keys(assetCode).length).toEqual(0);
}

async function validateTypescriptFixture(fixture): Promise<void> {
  return validateFixture(fixture, {
    plugins: [
      sucrase({
        exclude: ["node_modules/**"],
        transforms: ["typescript"],
      }),
    ],
  });
}

describe("Rollup Plugin Web Extension", () => {
  describe("Content Scripts", () => {
    describe("JavaScript", () => {
      it("Outputs manifest files with no imports", async () => {
        await validateFixture(JAVASCRIPT_CONTENT_WITH_NO_IMPORTS);
      });

      it("Outputs manifest files with unchunked import", async () => {
        await validateFixture(JAVASCRIPT_CONTENT_WITH_UNCHUNKED_IMPORT);
      });

      it("Outputs manifest files with chunked import", async () => {
        await validateFixture(JAVASCRIPT_CONTENT_WITH_CHUNKED_IMPORT);
      });

      it("Outputs manifest files with chunked dynamic import", async () => {
        await validateFixture(JAVASCRIPT_CONTENT_WITH_DYNAMIC_IMPORT);
      });
    });

    describe("TypeScript", () => {
      it("Outputs manifest files with no imports", async () => {
        await validateTypescriptFixture(TYPESCRIPT_CONTENT_WITH_NO_IMPORTS);
      });
    });
  });
});
