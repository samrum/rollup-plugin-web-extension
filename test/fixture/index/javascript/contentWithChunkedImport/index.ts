const inputManifest = {
  content_scripts: [
    {
      js: [
        "test/fixture/index/javascript/contentWithChunkedImport/content1.js",
      ],
      matches: ["https://*/*", "http://*/*"],
    },
    {
      js: [
        "test/fixture/index/javascript/contentWithChunkedImport/content2.js",
      ],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  content_scripts: [
    {
      js: [
        "loader/test/fixture/index/javascript/contentWithChunkedImport/content1.js",
      ],
      matches: ["https://*/*", "http://*/*"],
    },
    {
      js: [
        "loader/test/fixture/index/javascript/contentWithChunkedImport/content2.js",
      ],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
  web_accessible_resources: [
    "test/fixture/index/javascript/contentWithChunkedImport/content1.js",
    "importable-9eb98204.js",
    "test/fixture/index/javascript/contentWithChunkedImport/content2.js",
  ],
};

const chunkCode = {
  "test/fixture/index/javascript/contentWithChunkedImport/content1.js": `import { i as importable } from '../../../../../importable-9eb98204.js';

importable();
console.log("content");
`,
  "test/fixture/index/javascript/contentWithChunkedImport/content2.js": `import { i as importable } from '../../../../../importable-9eb98204.js';

importable();
console.log("content2");
`,
  "importable-9eb98204.js": `function importable() {
  console.log("importable");
}

export { importable as i };
`,
};

const assetCode = {
  "loader/test/fixture/index/javascript/contentWithChunkedImport/content1.js": `(async()=>{await import(chrome.runtime.getURL("test/fixture/index/javascript/contentWithChunkedImport/content1.js"))})();`,
  "loader/test/fixture/index/javascript/contentWithChunkedImport/content2.js": `(async()=>{await import(chrome.runtime.getURL("test/fixture/index/javascript/contentWithChunkedImport/content2.js"))})();`,
};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
