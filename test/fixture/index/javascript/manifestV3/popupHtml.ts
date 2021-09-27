const resourceDir = "test/fixture/index/javascript/resources/popupHtml";

const inputManifest = {
  action: {
    default_popup: `${resourceDir}/popup.html`,
  },
};

const expectedManifest = {
  action: {
    default_popup: `${resourceDir}/popup.html`,
  },
};

const chunkCode = {
  [`${resourceDir}/popup.js`]: `function importable() {
  console.log("importable");
}

importable();
console.log("popup");
`,
};

const assetCode = {
  [`${resourceDir}/popup.html`]: `<!DOCTYPE html>
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
