const inputManifest = {
  content_scripts: [
    {
      js: ["test/fixture/index/javascript/contentWithNoImports/content.js"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  content_scripts: [
    {
      js: ["test/fixture/index/javascript/contentWithNoImports/content.js"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  "test/fixture/index/javascript/contentWithNoImports/content.js": `console.log("content");\n`,
};

const assetCode = {};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode
};
