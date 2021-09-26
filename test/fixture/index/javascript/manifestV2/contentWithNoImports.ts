const resourceDir =
  "test/fixture/index/javascript/resources/contentWithNoImports";

const inputManifest = {
  content_scripts: [
    {
      js: [`${resourceDir}/content.js`],
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
  [`${resourceDir}/content.js`]: `console.log("content");\n`,
};

const assetCode = {};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
