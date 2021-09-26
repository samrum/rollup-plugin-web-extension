const resourceDir = "test/fixture/index/typescript/resources/backgroundScript";

const inputManifest = {
  background: {
    scripts: [`${resourceDir}/background.ts`],
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
  [`${resourceDir}/background.js`]: `function importable() {
  console.log("importable");
}

importable();
console.log("background");
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
