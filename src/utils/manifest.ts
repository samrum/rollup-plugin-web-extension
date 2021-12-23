import path from "path";
import { OutputBundle, OutputChunk } from "rollup";
import { ManifestChunk } from "vite";
import { ParseResult } from "../manifestParser/manifestParser";

export function parseManifestHtmlFile<Manifest extends chrome.runtime.Manifest>(
  htmlFileName: string | undefined,
  result: ParseResult<Manifest>
): ParseResult<Manifest> {
  if (!htmlFileName) {
    return result;
  }

  const outputFile = getOutputFileName(htmlFileName);

  result.inputScripts.push([outputFile, htmlFileName]);

  return result;
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

export function getOutputFileName(inputFileName: string): string {
  let { dir, name } = path.parse(path.normalize(inputFileName));

  if (!dir) {
    return name;
  }

  dir = dir.startsWith("/") ? dir.slice(1) : dir;

  return `${dir}/${name}`;
}

export function isSingleHtmlFilename(fileName: string): boolean {
  return /[^*]+.html$/.test(fileName);
}

export function updateContentSecurityPolicyForHmr(
  contentSecurityPolicy: string | undefined,
  hmrServerOrigin: string
): string {
  const cspHmrScriptSrc = `script-src ${hmrServerOrigin}; object-src 'self'`;

  if (!contentSecurityPolicy) {
    return cspHmrScriptSrc;
  }

  if (contentSecurityPolicy.includes("script-src")) {
    return contentSecurityPolicy.replace(`script-src`, cspHmrScriptSrc);
  }

  return (contentSecurityPolicy += `; ${cspHmrScriptSrc}`);
}

export function rewriteCssInBundleForManifestChunk(
  manifestChunk: ManifestChunk,
  outputBundle: OutputBundle
) {
  if (!manifestChunk.css?.length) {
    return;
  }

  const outputChunk = outputBundle[manifestChunk.file];
  if (outputChunk.type !== "chunk") {
    return;
  }

  outputChunk.code = outputChunk.code.replace(
    manifestChunk.file.replace(".js", ".css"),
    manifestChunk.css[0]
  );
}
