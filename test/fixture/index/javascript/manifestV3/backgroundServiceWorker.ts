const resourceDir =
  "test/fixture/index/javascript/resources/backgroundServiceWorker";

const inputManifest = {
  background: {
    service_worker: `${resourceDir}/serviceWorker.js`,
  },
};

const expectedManifest: Partial<chrome.runtime.ManifestV3> = {
  background: {
    service_worker: `serviceWorker.js`,
    type: "module",
  },
};

const chunkCode = {
  [`serviceWorker.js`]: `console.log("serviceWorker");\n`,
};

const assetCode = {};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
