export const inputManifest = {
  content_scripts: [
    {
      js: ["test/fixture/index/javascript/contentWithNoImports/content.js"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

export const expectedManifest = {
  content_scripts: [
    {
      js: ["test/fixture/index/javascript/contentWithNoImports/content.js"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

export const chunkCode = {
  "test/fixture/index/javascript/contentWithNoImports/content.js": `console.log("content");\n`,
};

export const assetCode = {};
