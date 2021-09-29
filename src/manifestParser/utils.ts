import fs from "fs";
import path from "path";
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

    if (isRemoteUrl(scriptFileName)) {
      continue;
    }

    const { dir: htmlDir } = path.parse(htmlFileName);
    const {
      dir: scriptDir,
      name: scriptName,
      ext: scriptExt,
    } = path.parse(scriptFileName);

    const outputFile = `${scriptDir || htmlDir}/${scriptName}`;

    let updatedScript = originalScriptElement.replace(
      `src="${scriptFileName}"`,
      `src="/${outputFile}.js"`
    );
    if (!updatedScript.includes('type="module"')) {
      updatedScript = `${updatedScript.slice(0, -1)} type="module">`;
    }

    html = html.replace(originalScriptElement, updatedScript);

    result.inputScripts?.push([outputFile, `${outputFile}${scriptExt}`]);
  }

  result.emitFiles?.push({
    type: "asset",
    fileName: htmlFileName,
    source: html,
  });

  return result;
}

export function isRemoteUrl(url: string): boolean {
  return /^[a-zA-Z]+\:\/\//.test(url);
}

export function getScriptLoaderFile(scriptFileName: string) {
  return {
    fileName: `${getLoaderDirectory()}/${scriptFileName}`,
    source: `(async()=>{await import(chrome.runtime.getURL("${scriptFileName}"))})();`,
  };
}

export function getLoaderDirectory() {
  return "loader";
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
