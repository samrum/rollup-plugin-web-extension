const currentDir = "test/fixture/index/manifestV2/javascript/optionsHtml";

const inputManifest = {
  options_ui: {
    page: `${currentDir}/options.html`,
  },
};

const expectedManifest = {
  options_ui: {
    page: `${currentDir}/options.html`,
  },
};

const chunkCode = {
  [`${currentDir}/options.js`]: `function importable() {
  console.log("importable");
}

importable();
console.log("options");
`,
};

const assetCode = {
  [`${currentDir}/options.html`]: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script type="module" src="options.js"></script>

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
