import path from "path";
import { OutputBundle, OutputChunk } from "rollup";
import { ParseResult } from "./manifestParser";

export function parseManifestHtmlFile(
  htmlFileName: string | undefined,
  result: ParseResult
): ParseResult {
  if (!htmlFileName) {
    return result;
  }

  const outputFile = getNameFromFileName(htmlFileName);

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

export function getNameFromFileName(inputFileName: string): string {
  const { name } = path.parse(inputFileName);

  return name;
}

export function findBundleOutputChunkForScript(
  bundle: OutputBundle,
  scriptFileName: string
): OutputChunk | null {
  const [, bundleFile] =
    Object.entries(bundle).find(([, output]) => {
      if (output.type !== "chunk") {
        return false;
      }

      return output.facadeModuleId?.endsWith(scriptFileName);
    }) || [];

  if (!bundleFile || bundleFile.type !== "chunk") {
    return null;
  }

  return bundleFile;
}

export function outputChunkHasImports(outputChunk: OutputChunk): boolean {
  return Boolean(
    outputChunk.imports.length || outputChunk.dynamicImports.length
  );
}

export function isSingleHtmlFilename(fileName: string): boolean {
  return /[^*]+.html$/.test(fileName);
}
