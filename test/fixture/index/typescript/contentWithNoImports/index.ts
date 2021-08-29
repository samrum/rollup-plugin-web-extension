const inputManifest = {
  content_scripts: [
    {
      js: ["test/fixture/index/typescript/contentWithNoImports/content.ts"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  content_scripts: [
    {
      js: ["test/fixture/index/typescript/contentWithNoImports/content.js"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  "test/fixture/index/typescript/contentWithNoImports/content.js": `console.log("content");\n`,
};

const assetCode = {};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode
};
