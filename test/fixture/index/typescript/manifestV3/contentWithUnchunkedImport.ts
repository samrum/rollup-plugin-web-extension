const resourceDir =
  "test/fixture/index/typescript/resources/contentWithUnchunkedImport";

const inputManifest = {
  content_scripts: [
    {
      js: [`${resourceDir}/content.ts`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  content_scripts: [
    {
      js: [`${resourceDir}/content.js`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  [`${resourceDir}/content.js`]: `function importable() {
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
