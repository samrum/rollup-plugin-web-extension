const currentDir =
  "test/fixture/index/javascript/resources/contentWithChunkedImport";

const inputManifest = {
  content_scripts: [
    {
      js: [`${currentDir}/content1.js`],
      matches: ["https://*/*", "http://*/*"],
    },
    {
      js: [`${currentDir}/content2.js`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  content_scripts: [
    {
      js: [`loader/${currentDir}/content1.js`],
      matches: ["https://*/*", "http://*/*"],
    },
    {
      js: [`loader/${currentDir}/content2.js`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
  web_accessible_resources: [
    {
      resources: [`${currentDir}/content1.js`, "importable-06c01150.js"],
      matches: ["https://*/*", "http://*/*"],
    },
    {
      resources: [`${currentDir}/content2.js`, "importable-06c01150.js"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  [`${currentDir}/content1.js`]: `import { i as importable } from '../../../../../../importable-06c01150.js';

importable();
console.log("content");
`,
  [`${currentDir}/content2.js`]: `import { i as importable } from '../../../../../../importable-06c01150.js';

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
  [`loader/${currentDir}/content1.js`]: `(async()=>{await import(chrome.runtime.getURL("${currentDir}/content1.js"))})();`,
  [`loader/${currentDir}/content2.js`]: `(async()=>{await import(chrome.runtime.getURL("${currentDir}/content2.js"))})();`,
};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
