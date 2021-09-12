const currentDir =
  "test/fixture/index/manifestV2/typescript/contentWithNoImports";

const inputManifest = {
  content_scripts: [
    {
      js: [`${currentDir}/content.ts`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  content_scripts: [
    {
      js: [`${currentDir}/content.js`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  [`${currentDir}/content.js`]: `console.log("content");\n`,
};

const assetCode = {};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
