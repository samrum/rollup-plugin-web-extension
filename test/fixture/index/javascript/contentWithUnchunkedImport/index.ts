const inputManifest = {
  content_scripts: [
    {
      js: [
        "test/fixture/index/javascript/contentWithUnchunkedImport/content.js",
      ],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  content_scripts: [
    {
      js: [
        "test/fixture/index/javascript/contentWithUnchunkedImport/content.js",
      ],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  "test/fixture/index/javascript/contentWithUnchunkedImport/content.js": `function importable() {
  console.log("importable");
}

importable();
console.log("content");
`,
};

const assetCode = {};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
