const resourceDir = "test/fixture/index/javascript/resources/backgroundHtml";

const inputManifest = {
  background: {
    page: `${resourceDir}/background.html`,
    persistent: false,
  },
};

const expectedManifest = {
  background: {
    page: `${resourceDir}/background.html`,
    persistent: false,
  },
};

const chunkCode = {
  [`${resourceDir}/background.js`]: `function log(message) {
  console.log(message);
}

log("background");
`,
};

const assetCode = {
  [`${resourceDir}/background.html`]: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script type="module" src="/${resourceDir}/background.js"></script>

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
