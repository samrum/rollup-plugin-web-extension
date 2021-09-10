const currentDir = 'test/fixture/index/manifestV2/javascript/contentWithUnchunkedImport';

const inputManifest = {
  content_scripts: [
    {
      js: [
        `${currentDir}/content.js`,
      ],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  content_scripts: [
    {
      js: [
        `${currentDir}/content.js`,
      ],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  [`${currentDir}/content.js`]: `function importable() {
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
