const resourceDir = "test/fixture/index/javascript/resources/backgroundScript";

const inputManifest = {
  background: {
    scripts: [`${resourceDir}/background.js`],
    persistent: false,
  },
};

const expectedManifest = {
  background: {
    persistent: false,
    page: `loader/background.html`,
  },
};

const chunkCode = {
  [`${resourceDir}/background.js`]: `function log(message) {
  console.log(message);
}

log("background");
`,
};

const assetCode = {
  [`loader/background.html`]: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><script type="module" src="/${resourceDir}/background.js"></script></head></html>`,
};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
