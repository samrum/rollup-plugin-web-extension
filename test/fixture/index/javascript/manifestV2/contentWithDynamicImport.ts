const currentDir =
  "test/fixture/index/javascript/resources/contentWithDynamicImport";

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
    `${currentDir}/content1.js`,
    "importable-8364a465.js",
    `${currentDir}/content2.js`,
  ],
};

const chunkCode = {
  [`${currentDir}/content1.js`]: `(async () => {
  const importable = await import('../../../../../../importable-8364a465.js');

  importable();

  console.log("content");
})();
`,
  [`${currentDir}/content2.js`]: `(async () => {
  const importable = await import('../../../../../../importable-8364a465.js');

  importable();

  console.log("content2");
})();
`,
  "importable-8364a465.js": `function importable() {
  console.log("importable");
}

export { importable as default };
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
