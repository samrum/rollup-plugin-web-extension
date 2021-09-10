const currentDirectory =
  "test/fixture/index/manifestV2/typescript/contentWithNoImports";

const inputManifest = {
  content_scripts: [
    {
      js: [`${currentDirectory}/content.ts`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  content_scripts: [
    {
      js: [`${currentDirectory}/content.js`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  [`${currentDirectory}/content.js`]: `console.log("content");\n`,
};

const assetCode = {};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
