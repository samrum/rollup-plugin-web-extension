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
    `${resourceDir}/content1.js`,
    "importable-8e1bceda.js",
    `${resourceDir}/content2.js`,
  ],
};

const chunkCode = {
  [`${resourceDir}/content1.js`]: `import { i as importable } from '../../../../../../importable-8e1bceda.js';

importable();
console.log("content");
`,
  [`${resourceDir}/content2.js`]: `import { i as importable } from '../../../../../../importable-8e1bceda.js';

importable();
console.log("content2");
`,
  "importable-8e1bceda.js": `function importable() {
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
