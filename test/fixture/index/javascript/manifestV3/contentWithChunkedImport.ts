const resourceDir =
  "test/fixture/index/javascript/resources/contentWithChunkedImport";

const inputManifest = {
  content_scripts: [
    {
      js: [`${resourceDir}/content1.js`],
      matches: ["https://*/*", "http://*/*"],
    },
    {
      js: [`${resourceDir}/content2.js`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  content_scripts: [
    {
      js: [`loader/${resourceDir}/content1.js`],
      matches: ["https://*/*", "http://*/*"],
    },
    {
      js: [`loader/${resourceDir}/content2.js`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
  web_accessible_resources: [
    {
      resources: [`${resourceDir}/content1.js`, "log-3aa28c52.js"],
      matches: ["https://*/*", "http://*/*"],
    },
    {
      resources: [`${resourceDir}/content2.js`, "log-3aa28c52.js"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  [`${resourceDir}/content1.js`]: `import { l as log } from '../../../../../../log-3aa28c52.js';

log("content");
`,
  [`${resourceDir}/content2.js`]: `import { l as log } from '../../../../../../log-3aa28c52.js';

log("content2");
`,
  "log-3aa28c52.js": `function log(message) {
  console.log(message);
}

export { log as l };
`,
};

const assetCode = {
  [`loader/${resourceDir}/content1.js`]: `(async()=>{await import(chrome.runtime.getURL("${resourceDir}/content1.js"))})();`,
  [`loader/${resourceDir}/content2.js`]: `(async()=>{await import(chrome.runtime.getURL("${resourceDir}/content2.js"))})();`,
};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
