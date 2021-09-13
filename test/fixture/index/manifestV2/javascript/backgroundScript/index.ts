const currentDir = "test/fixture/index/manifestV2/javascript/backgroundScript";

const inputManifest = {
  background: {
    scripts: [`${currentDir}/background.js`],
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
  [`${currentDir}/background.js`]: `function importable() {
  console.log("importable");
}

importable();
console.log("background");
`,
};

const assetCode = {
  [`loader/background.html`]: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><script type="module" src="${currentDir}/background.js"></script></head></html>`,
};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
