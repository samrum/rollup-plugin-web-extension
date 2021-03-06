const resourceDir =
  "test/fixture/index/typescript/resources/contentWithDynamicImport";

const inputManifest = {
  content_scripts: [
    {
      js: [`${resourceDir}/content1.ts`],
      matches: ["https://*/*", "http://*/*"],
    },
    {
      js: [`${resourceDir}/content2.ts`],
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
    "log-3e62c36e.js",
    `${resourceDir}/content2.js`,
  ],
};

const chunkCode = {
  [`${resourceDir}/content1.js`]: `(async () => {
  const log = await import('../../../../../../log-3e62c36e.js');

  log("content");
})();
`,
  [`${resourceDir}/content2.js`]: `(async () => {
  const log = await import('../../../../../../log-3e62c36e.js');

  log("content2");
})();
`,
  "log-3e62c36e.js": `function log(message) {
  console.log(message);
}

export { log as default };
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
