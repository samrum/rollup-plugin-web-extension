const currentDir =
  "test/fixture/index/javascript/resources/backgroundServiceWorker";

const inputManifest = {
  background: {
    service_worker: `${currentDir}/serviceWorker.js`,
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
