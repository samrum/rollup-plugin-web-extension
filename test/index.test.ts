import { rollup } from "rollup";
import sucrase from '@rollup/plugin-sucrase';
import webExtension from "./../src/index";
import { isOutputChunk } from "./../src/manifest";
import {
  chunkCodeContentWithChunkedDynamicImport,
  chunkCodeContentWithChunkedDynamicImport2,
  chunkCodeContentWithChunkedImport,
  chunkCodeContentWithChunkedImport2,
  chunkCodeContentWithImport,
  chunkCodeImportable,
  chunkCodeImportableDynamic,
} from "./fixture/basic/outputChunkCode";

describe("Rollup Plugin Web Extension", () => {
  describe("Content Scripts - JavaScript", () => {
    it("Outputs manifest files with no imports", async () => {
      const manifest = {
        version: "2.0.0",
        name: "Manifest Name",
        description: "Manifest Description",
        manifest_version: 2,
        content_scripts: [
          {
            js: ["test/fixture/basic/content.js"],
            matches: ["https://*/*", "http://*/*"],
          },
        ],
      };

      const outputManifest = JSON.parse(JSON.stringify(manifest));

      const bundle = await rollup({
        plugins: [
          webExtension({
            manifest,
          }),
        ],
      });

      const { output } = await bundle.generate({});

      const chunkCode = {
        "test/fixture/basic/content.js": `console.log("content");\n`,
      };
      const assetCode = {
        "manifest.json": JSON.stringify(outputManifest, null, 2),
      };

      output.forEach((file) => {
        if (isOutputChunk(file)) {
          expect(file.code).toEqual(chunkCode[file.fileName]);
        } else {
          expect(file.source).toEqual(assetCode[file.fileName]);
        }
      });
    });

    it("Outputs manifest files with unchunked import", async () => {
      const manifest = {
        version: "2.0.0",
        name: "Manifest Name",
        description: "Manifest Description",
        manifest_version: 2,
        content_scripts: [
          {
            js: ["test/fixture/basic/contentWithImport.js"],
            matches: ["https://*/*", "http://*/*"],
          },
        ],
      };

      const outputManifest = JSON.parse(JSON.stringify(manifest));

      const bundle = await rollup({
        plugins: [
          webExtension({
            manifest,
          }),
        ],
      });

      const { output } = await bundle.generate({});

      const chunkCode = {
        "test/fixture/basic/contentWithImport.js": chunkCodeContentWithImport,
      };
      const assetCode = {
        "manifest.json": JSON.stringify(outputManifest, null, 2),
      };

      output.forEach((file) => {
        if (isOutputChunk(file)) {
          expect(file.code).toEqual(chunkCode[file.fileName]);
        } else {
          expect(file.source).toEqual(assetCode[file.fileName]);
        }
      });
    });

    it("Outputs manifest files with chunked import", async () => {
      const manifest = {
        version: "2.0.0",
        name: "Manifest Name",
        description: "Manifest Description",
        manifest_version: 2,
        content_scripts: [
          {
            js: ["test/fixture/basic/contentWithChunkedImport.js"],
            matches: ["https://*/*", "http://*/*"],
          },
          {
            js: ["test/fixture/basic/contentWithChunkedImport2.js"],
            matches: ["https://*/*", "http://*/*"],
          },
        ],
      };

      const outputManifest = {
        ...manifest,
        content_scripts: [
          {
            js: ["loader/test/fixture/basic/contentWithChunkedImport.js"],
            matches: ["https://*/*", "http://*/*"],
          },
          {
            js: ["loader/test/fixture/basic/contentWithChunkedImport2.js"],
            matches: ["https://*/*", "http://*/*"],
          },
        ],
        web_accessible_resources: [
          "test/fixture/basic/contentWithChunkedImport.js",
          "importable-c4117e7c.js",
          "test/fixture/basic/contentWithChunkedImport2.js",
        ],
      };

      const bundle = await rollup({
        plugins: [
          webExtension({
            manifest,
          }),
        ],
      });

      const { output } = await bundle.generate({});

      const chunkCode = {
        "test/fixture/basic/contentWithChunkedImport.js":
          chunkCodeContentWithChunkedImport,
        "test/fixture/basic/contentWithChunkedImport2.js":
          chunkCodeContentWithChunkedImport2,
        "importable-c4117e7c.js": chunkCodeImportable,
      };
      const assetCode = {
        "manifest.json": JSON.stringify(outputManifest, null, 2),
        "loader/test/fixture/basic/contentWithChunkedImport.js": `(async()=>{await import(chrome.runtime.getURL("test/fixture/basic/contentWithChunkedImport.js"))})();`,
        "loader/test/fixture/basic/contentWithChunkedImport2.js": `(async()=>{await import(chrome.runtime.getURL("test/fixture/basic/contentWithChunkedImport2.js"))})();`,
      };

      output.forEach((file) => {
        if (isOutputChunk(file)) {
          expect(file.code).toEqual(chunkCode[file.fileName]);
        } else {
          expect(file.source).toEqual(assetCode[file.fileName]);
        }
      });
    });

    it("Outputs manifest files with chunked dynamic import", async () => {
      const manifest = {
        version: "2.0.0",
        name: "Manifest Name",
        description: "Manifest Description",
        manifest_version: 2,
        content_scripts: [
          {
            js: ["test/fixture/basic/contentWithDynamicImport.js"],
            matches: ["https://*/*", "http://*/*"],
          },
          {
            js: ["test/fixture/basic/contentWithDynamicImport2.js"],
            matches: ["https://*/*", "http://*/*"],
          },
        ],
      };

      const outputManifest = {
        ...manifest,
        content_scripts: [
          {
            js: ["loader/test/fixture/basic/contentWithDynamicImport.js"],
            matches: ["https://*/*", "http://*/*"],
          },
          {
            js: ["loader/test/fixture/basic/contentWithDynamicImport2.js"],
            matches: ["https://*/*", "http://*/*"],
          },
        ],
        web_accessible_resources: [
          "test/fixture/basic/contentWithDynamicImport.js",
          "importable-5243f143.js",
          "test/fixture/basic/contentWithDynamicImport2.js",
        ],
      };

      const bundle = await rollup({
        plugins: [
          webExtension({
            manifest,
          }),
        ],
      });

      const { output } = await bundle.generate({});

      const chunkCode = {
        "test/fixture/basic/contentWithDynamicImport.js":
          chunkCodeContentWithChunkedDynamicImport,
        "test/fixture/basic/contentWithDynamicImport2.js":
          chunkCodeContentWithChunkedDynamicImport2,
        "importable-5243f143.js": chunkCodeImportableDynamic,
      };
      const assetCode = {
        "manifest.json": JSON.stringify(outputManifest, null, 2),
        "loader/test/fixture/basic/contentWithDynamicImport.js": `(async()=>{await import(chrome.runtime.getURL("test/fixture/basic/contentWithDynamicImport.js"))})();`,
        "loader/test/fixture/basic/contentWithDynamicImport2.js": `(async()=>{await import(chrome.runtime.getURL("test/fixture/basic/contentWithDynamicImport2.js"))})();`,
      };

      output.forEach((file) => {
        if (isOutputChunk(file)) {
          expect(file.code).toEqual(chunkCode[file.fileName]);
        } else {
          expect(file.source).toEqual(assetCode[file.fileName]);
        }
      });
    });
  });

  describe("Content Scripts - Typescript", () => {
    it("Transforms and outputs manifest files with no imports", async () => {
      const manifest = {
        version: "2.0.0",
        name: "Manifest Name",
        description: "Manifest Description",
        manifest_version: 2,
        content_scripts: [
          {
            js: ["test/fixture/typescript/content.ts"],
            matches: ["https://*/*", "http://*/*"],
          },
        ],
      };

      const outputManifest = {
        ...manifest,
        content_scripts: [
          {
            js: ["test/fixture/typescript/content.js"],
            matches: ["https://*/*", "http://*/*"],
          },
        ],
      };

      const bundle = await rollup({
        plugins: [
          sucrase({
            exclude: ['node_modules/**'],
            transforms: ['typescript']
          }),
          webExtension({
            manifest,
          }),
        ],
      });

      const { output } = await bundle.generate({});

      const chunkCode = {
        "test/fixture/typescript/content.js": `console.log("content");\n`,
      };
      const assetCode = {
        "manifest.json": JSON.stringify(outputManifest, null, 2),
      };

      output.forEach((file) => {
        if (isOutputChunk(file)) {
          expect(file.code).toEqual(chunkCode[file.fileName]);
        } else {
          expect(file.source).toEqual(assetCode[file.fileName]);
        }
      });
    });
  });
});
