const currentDir = "test/fixture/index/javascript/resources/contentCss";

const inputManifest = {
  content_scripts: [
    {
      js: [`${currentDir}/content.js`],
      css: [`${currentDir}/content.css`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  content_scripts: [
    {
      js: [`${currentDir}/content.js`],
      css: [`${currentDir}/content.css`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  [`${currentDir}/content.js`]: `console.log("content");\n`,
};

const assetCode = {
  [`${currentDir}/content.css`]: `.css {
}\n`,
};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
