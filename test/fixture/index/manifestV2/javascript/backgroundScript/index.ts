const currentDir = "test/fixture/index/manifestV2/javascript/backgroundScript";

const inputManifest = {
  background: {
    scripts: [`${currentDir}/background.js`],
    persistent: false,
  },
};

const expectedManifest = {
  background: {
    scripts: [`${currentDir}/background.js`],
    persistent: false,
  },
};

const chunkCode = {};

const assetCode = {};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
