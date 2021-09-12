import fs from "fs";
import { mocked } from "ts-jest/utils";
import ManifestV2 from "../../src/manifestParser/manifestV2";

jest.mock("fs");

const mockedFs = mocked(fs, true);

describe("ManifestV2", () => {
  function getManifestV2Instance(
    manifest: Partial<chrome.runtime.ManifestV2>
  ): ManifestV2 {
    return new ManifestV2({
      version: "2.0.0",
      name: "Manifest Name",
      description: "Manifest Description",
      manifest_version: 2,
      ...manifest,
    });
  }

  describe("parseManifestContentScripts", () => {
    it("Extracts inputScripts and updates manifest for js", () => {
      const manifestV2 = getManifestV2Instance({
        content_scripts: [
          {
            js: ["src/content/index.ts"],
            matches: ["https://*/*", "http://*/*"],
          },
        ],
      });

      const { inputScripts, emitFiles } =
        manifestV2.parseManifestContentScripts();

      expect(inputScripts).toEqual([
        ["src/content/index", "src/content/index.ts"],
      ]);
      expect(emitFiles).toEqual([]);
      expect(manifestV2.getManifest().content_scripts![0].js).toEqual([
        "src/content/index.js",
      ]);
    });

    it("Extracts emitFiles and updates manifest for css", () => {
      const manifestV2 = getManifestV2Instance({
        content_scripts: [
          {
            css: ["src/content/index.css"],
            matches: ["https://*/*", "http://*/*"],
          },
        ],
      });

      mockedFs.readFileSync.mockReturnValueOnce(".css {}");

      const { inputScripts, emitFiles } =
        manifestV2.parseManifestContentScripts();

      expect(inputScripts).toEqual([]);
      expect(emitFiles).toEqual([
        {
          type: "asset",
          fileName: "src/content/index.css",
          source: ".css {}",
        },
      ]);
      expect(manifestV2.getManifest().content_scripts![0].css).toEqual([
        "src/content/index.css",
      ]);
    });
  });

  describe("parseManifestHtmlFiles", () => {
    it("Extracts inputScripts, emitFiles, and updates html for background html", () => {
      const manifestV2 = getManifestV2Instance({
        background: {
          page: "src/background/index.html",
          persistent: false,
        },
      });

      mockedFs.readFileSync.mockReturnValueOnce(
        `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script type="module" src="index.ts"></script>
    <script src="index2.ts"></script>
  </head>
</html>
      `.trim()
      );

      const { inputScripts, emitFiles } = manifestV2.parseManifestHtmlFiles();

      expect(inputScripts).toEqual([
        ["src/background/index", "src/background/index.ts"],
        ["src/background/index2", "src/background/index2.ts"],
      ]);
      expect(emitFiles).toEqual([
        {
          type: "asset",
          fileName: "src/background/index.html",
          source: `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script type="module" src="index.js"></script>
    <script src="index2.js" type="module"></script>
  </head>
</html>
        `.trim(),
        },
      ]);
    });

    it("Extracts inputScripts, emitFiles, and updates html for popup html", () => {
      const manifestV2 = getManifestV2Instance({
        browser_action: {
          default_popup: "src/pages/popup/index.html",
        },
      });

      mockedFs.readFileSync.mockReturnValueOnce(
        `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script type="module" src="index.ts"></script>
    <script src="index2.ts"></script>
  </head>
</html>
      `.trim()
      );

      const { inputScripts, emitFiles } = manifestV2.parseManifestHtmlFiles();

      expect(inputScripts).toEqual([
        ["src/pages/popup/index", "src/pages/popup/index.ts"],
        ["src/pages/popup/index2", "src/pages/popup/index2.ts"],
      ]);
      expect(emitFiles).toEqual([
        {
          type: "asset",
          fileName: "src/pages/popup/index.html",
          source: `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script type="module" src="index.js"></script>
    <script src="index2.js" type="module"></script>
  </head>
</html>
        `.trim(),
        },
      ]);
    });
  });

  describe("manifestV2.parseBundleForDynamicContentScripts", () => {
    it("Emits wrapper file and updates manifest to use it for content script bundle with imports", () => {
      const manifestV2 = getManifestV2Instance({
        content_scripts: [
          {
            js: ["src/content/index.js"],
            matches: ["https://*/*", "http://*/*"],
          },
        ],
      });

      const { emitFiles } = manifestV2.parseBundleForDynamicContentScripts({
        "src/content/index.js": {
          exports: [],
          facadeModuleId: "/Users/dev/src/content/index.ts",
          isDynamicEntry: false,
          isEntry: true,
          isImplicitEntry: false,
          modules: {
            "/Users/dev/src/content/index.ts": {
              code: "sharedScript();",
              originalLength: 100,
              removedExports: [],
              renderedExports: [],
              renderedLength: 15,
            },
          },
          name: "content/index",
          type: "chunk",
          code: "import { s as sharedScript } from '../assets/sharedScript-e83178fa.js';\n\nsharedScript();\n",
          dynamicImports: [],
          fileName: "content/index.js",
          implicitlyLoadedBefore: [],
          importedBindings: { "assets/sharedScript-e83178fa.js": ["s"] },
          imports: ["assets/sharedScript-e83178fa.js"],
          referencedFiles: [],
        },
      });

      expect(emitFiles).toEqual([
        {
          type: "asset",
          fileName: "loader/src/content/index.js",
          source: `(async()=>{await import(chrome.runtime.getURL("src/content/index.js"))})();`,
        },
      ]);
      expect(manifestV2.getManifest().content_scripts![0].js).toEqual([
        "loader/src/content/index.js",
      ]);
      expect(manifestV2.getManifest().web_accessible_resources).toEqual([
        "src/content/index.js",
        "assets/sharedScript-e83178fa.js",
      ]);
    });

    it("Emits wrapper file and updates manifest to use it for content script bundle with dynamic imports", () => {
      const manifestV2 = getManifestV2Instance({
        content_scripts: [
          {
            js: ["src/content/index.js"],
            matches: ["https://*/*", "http://*/*"],
          },
        ],
      });

      const { emitFiles } = manifestV2.parseBundleForDynamicContentScripts({
        "src/content/index.js": {
          exports: [],
          facadeModuleId: "/Users/dev/src/content/index.ts",
          isDynamicEntry: false,
          isEntry: true,
          isImplicitEntry: false,
          modules: {
            "/Users/dev/src/content/index.ts": {
              code: "(async () => {\n    const sharedScript = await import('../assets/sharedScript-1a7717e1.js');\n    sharedScript();\n})();",
              originalLength: 153,
              removedExports: [],
              renderedExports: [],
              renderedLength: 105,
            },
          },
          name: "content/index",
          type: "chunk",
          code: "(async () => {\n    const sharedScript = await import('../assets/sharedScript-1a7717e1.js');\n    sharedScript();\n})();\n",
          dynamicImports: ["assets/sharedScript-1a7717e1.js"],
          fileName: "content/index.js",
          implicitlyLoadedBefore: [],
          importedBindings: {},
          imports: [],
          referencedFiles: [],
        },
      });

      expect(emitFiles).toEqual([
        {
          type: "asset",
          fileName: "loader/src/content/index.js",
          source: `(async()=>{await import(chrome.runtime.getURL("src/content/index.js"))})();`,
        },
      ]);
      expect(manifestV2.getManifest().content_scripts![0].js).toEqual([
        "loader/src/content/index.js",
      ]);
      expect(manifestV2.getManifest().web_accessible_resources).toEqual([
        "src/content/index.js",
        "assets/sharedScript-1a7717e1.js",
      ]);
    });

    it("Does not emit wrapper for content scripts with no imports", () => {
      const manifestV2 = getManifestV2Instance({
        content_scripts: [
          {
            js: ["src/content/index.js"],
            matches: ["https://*/*", "http://*/*"],
          },
        ],
      });

      const { emitFiles } = manifestV2.parseBundleForDynamicContentScripts({
        "src/content/index.js": {
          exports: [],
          facadeModuleId: "/Users/dev/src/content/index.ts",
          isDynamicEntry: false,
          isEntry: true,
          isImplicitEntry: false,
          modules: {
            "/Users/dev/src/content/index.ts": {
              code: "console.log('hello world');",
              originalLength: 75,
              removedExports: [],
              renderedExports: [],
              renderedLength: 27,
            },
          },
          name: "content/index",
          type: "chunk",
          code: "console.log('hello world');\n",
          dynamicImports: [],
          fileName: "content/index.js",
          implicitlyLoadedBefore: [],
          importedBindings: {},
          imports: [],
          referencedFiles: [],
        },
      });

      expect(emitFiles).toEqual([]);
      expect(manifestV2.getManifest().content_scripts![0].js).toEqual([
        "src/content/index.js",
      ]);
      expect(manifestV2.getManifest().web_accessible_resources).toBe(undefined);
    });
  });
});
