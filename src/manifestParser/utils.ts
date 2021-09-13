import fs from "fs";
import { ParseResult } from "./manifestParser";

export function parseManifestHtmlFile(
  htmlFileName: string
): Partial<ParseResult<chrome.runtime.Manifest>> {
  const result: Partial<ParseResult<chrome.runtime.Manifest>> = {
    inputScripts: [],
    emitFiles: [],
  };

  let html = fs.readFileSync(htmlFileName, "utf-8");

  const scriptRegExp = new RegExp('<script[^>]*src="(.*)"[^>]*>', "gi");
  let match;

  while ((match = scriptRegExp.exec(html)) !== null) {
    const [originalScriptElement, scriptFileName] = match;

    // Don't process remote scripts
    if (/^[a-zA-Z]+\:\/\//.test(scriptFileName)) {
      continue;
    }

    const inputDirectory = htmlFileName.split("/").slice(0, -1).join("/");
    const outputFile = `${scriptFileName.split(".")[0]}`;
    const outputFileName = `${inputDirectory}/${outputFile}`;

    let updatedScript = originalScriptElement.replace(
      `src="${scriptFileName}"`,
      `src="${outputFile}.js"`
    );
    if (!updatedScript.includes('type="module"')) {
      updatedScript = `${updatedScript.slice(0, -1)} type="module">`;
    }

    html = html.replace(originalScriptElement, updatedScript);

    result.inputScripts?.push([
      outputFileName,
      `${inputDirectory}/${scriptFileName}`,
    ]);
  }

  result.emitFiles?.push({
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

export function pipe<T>(
  context: any,
  initialValue: T,
  ...fns: ((result: T) => T)[]
): T {
  return fns.reduce(
    (previousValue, fn) => fn.call(context, previousValue),
    initialValue
  );
}
