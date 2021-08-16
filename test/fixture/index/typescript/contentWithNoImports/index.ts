export const inputManifest = {
  content_scripts: [
    {
      js: ["test/fixture/index/typescript/contentWithNoImports/content.ts"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

export const expectedManifest = {
  content_scripts: [
    {
      js: ["test/fixture/index/typescript/contentWithNoImports/content.js"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

export const chunkCode = {
  "test/fixture/index/typescript/contentWithNoImports/content.js": `console.log("content");\n`,
};

export const assetCode = {};
