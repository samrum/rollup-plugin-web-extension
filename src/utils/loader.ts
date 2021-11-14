import { getNameFromFileName } from "../manifestParser/utils";
import { createHash } from "./crypto";

const LOADER_DIR = "web-extension";

export function getScriptHtmlLoaderFile(name: string, scriptSrcs: string[]) {
  const scriptsHtml = scriptSrcs
    .map((scriptSrc) => {
      return `<script type="module" src="${scriptSrc}"></script>`;
    })
    .join("");

  const hash = createHash(name, scriptsHtml);

  return {
    fileName: `${LOADER_DIR}/${name}.${hash}.html`,
    source: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />${scriptsHtml}</head></html>`,
  };
}

export function getContentScriptLoaderFile(outputChunkFileName: string) {
  const name = getNameFromFileName(outputChunkFileName);

  const hash = createHash(name, outputChunkFileName);

  return {
    fileName: `${LOADER_DIR}/${name}.${hash}.js`,
    source: `(async()=>{await import(chrome.runtime.getURL("${outputChunkFileName}"))})();`,
  };
}

export function getServiceWorkerLoaderFile(serviceWorkerFileName: string) {
  return {
    fileName: `webExtensionServiceWorker.js`,
    source: `import "/${serviceWorkerFileName}";`,
  };
}
