export const inputManifest = {
  content_scripts: [
    {
      js: ["test/fixture/index/javascript/file/contentWithImport.js"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

export const expectedManifest = {
  content_scripts: [
    {
      js: ["test/fixture/index/javascript/file/contentWithImport.js"],
      matches: ["https://*/*", "http://*/*"],
    },
  ],
};

export const chunkCode = {
  "test/fixture/index/javascript/file/contentWithImport.js": `function importable() {
  console.log("importable");
}

importable();
console.log("content");
`,
};

export const assetCode = {};
