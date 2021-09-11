import fs from "fs";
import { ParseResult } from "./manifestParser";

export function parseManifestHtmlFile(htmlFileName: string): ParseResult {
  const result: ParseResult = {
    inputScripts: [],
    emitFiles: [],
  };

  let html = fs.readFileSync(htmlFileName, "utf-8");

  const scriptRegExp = new RegExp('<script[^>]*src="(.*)"[^>]*>', "gi");
  let match;

  while ((match = scriptRegExp.exec(html)) !== null) {
    const [originalScript, scriptFileName] = match;

    const inputDirectory = htmlFileName.split("/").slice(0, -1).join("/");
    const outputFile = `${scriptFileName.split(".")[0]}`;
    const outputFileName = `${inputDirectory}/${outputFile}`;

    let updatedScript = originalScript.replace(
      `src="${scriptFileName}"`,
      `src="${outputFile}.js"`
    );
    if (!updatedScript.includes('type="module"')) {
      updatedScript = `${updatedScript.slice(0, -1)} type="module">`;
    }

    html = html.replace(originalScript, updatedScript);

    result.inputScripts.push([
      outputFileName,
      `${inputDirectory}/${scriptFileName}`,
    ]);
  }

  result.emitFiles.push({
    type: "asset",
    fileName: htmlFileName,
    source: html,
  });

  return result;
}

export function getScriptLoaderFile(scriptFileName: string) {
  return {
    fileName: `loader/${scriptFileName}`,
    source: `(async()=>{await import(chrome.runtime.getURL("${scriptFileName}"))})();`,
  };
}
