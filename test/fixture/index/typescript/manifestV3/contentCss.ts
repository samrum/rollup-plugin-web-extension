const resourceDir = "test/fixture/index/typescript/resources/contentCss";

const inputManifest = {
  content_scripts: [
    {
      js: [`${resourceDir}/content.ts`],
      css: [`${resourceDir}/content.css`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  content_scripts: [
    {
      js: [`${resourceDir}/content.js`],
      css: [`${resourceDir}/content.css`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  [`${resourceDir}/content.js`]: `console.log("content");\n`,
};

const assetCode = {
  [`${resourceDir}/content.css`]: `.css {
}\n`,
};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
