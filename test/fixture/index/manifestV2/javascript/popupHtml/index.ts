const currentDir = "test/fixture/index/manifestV2/javascript/popupHtml";

const inputManifest = {
  browser_action: {
    default_popup: `${currentDir}/popup.html`,
  },
};

const expectedManifest = {
  browser_action: {
    default_popup: `${currentDir}/popup.html`,
  },
};

const chunkCode = {
  [`${currentDir}/popup.js`]: `function importable() {
  console.log("importable");
}

importable();
console.log("popup");
`,
};

const assetCode = {
  [`${currentDir}/popup.html`]: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script type="module" src="popup.js"></script>

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
