export const inputManifest = {
  content_scripts: [
    {
      js: ["test/fixture/index/javascript/file/content.js"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

export const expectedManifest = {
  content_scripts: [
    {
      js: ["test/fixture/index/javascript/file/content.js"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

export const chunkCode = {
  "test/fixture/index/javascript/file/content.js": `console.log("content");\n`,
};

export const assetCode = {};
