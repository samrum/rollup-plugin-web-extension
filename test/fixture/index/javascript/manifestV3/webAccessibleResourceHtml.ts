const resourceDir =
  "test/fixture/index/javascript/resources/webAccessibleResourceHtml";

const inputManifest = {
  web_accessible_resources: [
    {
      resources: [`${resourceDir}/webAccessibleResource.html`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const expectedManifest = {
  web_accessible_resources: [
    {
      resources: [`${resourceDir}/webAccessibleResource.html`],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

const chunkCode = {
  [`${resourceDir}/webAccessibleResource.js`]: `function log(message) {
  console.log(message);
}

log("webAccessibleResource");
`,
};

const assetCode = {
  [`${resourceDir}/webAccessibleResource.html`]: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script type="module" src="/${resourceDir}/webAccessibleResource.js"></script>

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
