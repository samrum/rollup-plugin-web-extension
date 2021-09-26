const resourceDir =
  "test/fixture/index/typescript/resources/backgroundServiceWorker";

const inputManifest = {
  background: {
    service_worker: `${resourceDir}/serviceWorker.ts`,
  },
};

const expectedManifest = {
  background: {
    service_worker: `serviceWorker.js`,
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
