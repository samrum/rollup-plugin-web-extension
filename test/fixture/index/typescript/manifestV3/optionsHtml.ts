const resourceDir = "test/fixture/index/typescript/resources/optionsHtml";

const inputManifest = {
  options_ui: {
    page: `${resourceDir}/options.html`,
  },
};

const expectedManifest = {
  options_ui: {
    page: `${resourceDir}/options.html`,
  },
};

const chunkCode = {
  [`${resourceDir}/options.js`]: `function log(message) {
  console.log(message);
}

log("options");
`,
};

const assetCode = {
  [`${resourceDir}/options.html`]: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script type="module" src="/${resourceDir}/options.js"></script>

    <script src="http://example.com/httpScript.js"></script>
    <script type="module" src="http://example.com/httpModuleScript.js"></script>
    <script src="ftp://example.com/ftpScript.js"></script>
    <script type="module" src="ftp://example.com/ftpModuleScript.js"></script>
  </head>
</html>
`,
};

export default {
  inputManifest,
  expectedManifest,
  chunkCode,
  assetCode,
};
