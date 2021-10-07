const resourceDir =
  "test/fixture/index/javascript/resources/backgroundServiceWorker";

const inputManifest = {
  background: {
    service_worker: `${resourceDir}/serviceWorker.js`,
  },
};

const expectedManifest: Partial<chrome.runtime.ManifestV3> = {
  background: {
    service_worker: `serviceWorkerLoader.js`,
    type: "module",
  },
};

const chunkCode = {
  [`${resourceDir}/serviceWorker.js`]: `console.log("serviceWorker");\n`,
};

const assetCode = {
  ["serviceWorkerLoader.js"]: `import "/${`${resourceDir}/serviceWorker.js`}";`,
};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
