const resourceDir =
  "test/fixture/index/javascript/resources/contentWithSameScriptName";

const inputManifest = {
  content_scripts: [
    {
      js: [`${resourceDir}/content1/content.js`],
      matches: ["https://*/*", "http://*/*"],
    },
    {
      js: [`${resourceDir}/content2/content.js`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  content_scripts: [
    {
      js: [`${resourceDir}/content1/content.js`],
      matches: ["https://*/*", "http://*/*"],
    },
    {
      js: [`${resourceDir}/content2/content.js`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  [`${resourceDir}/content1/content.js`]: `console.log("content1");\n`,
  [`${resourceDir}/content2/content.js`]: `console.log("content2");\n`,
};

const assetCode = {};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
