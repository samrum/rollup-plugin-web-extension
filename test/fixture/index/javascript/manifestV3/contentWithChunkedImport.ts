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
      resources: [`${resourceDir}/content1.js`, "importable-06c01150.js"],
      matches: ["https://*/*", "http://*/*"],
    },
    {
      resources: [`${resourceDir}/content2.js`, "importable-06c01150.js"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  [`${resourceDir}/content1.js`]: `import { i as importable } from '../../../../../../importable-06c01150.js';

importable();
console.log("content");
`,
  [`${resourceDir}/content2.js`]: `import { i as importable } from '../../../../../../importable-06c01150.js';

importable();
console.log("content2");
`,
  "importable-06c01150.js": `function importable() {
  console.log("importable");
}

export { importable as i };
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
