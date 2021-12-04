import path from "path";
import { OutputAsset, OutputBundle, OutputChunk } from "rollup";
import { ParseResult } from "./manifestParser";

export function parseManifestHtmlFile(
  htmlFileName: string | undefined,
  result: ParseResult
): ParseResult {
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

export function findBundleOutputChunkForScript(
  bundle: OutputBundle,
  scriptFileName: string
): OutputChunk | null {
  const [, bundleFile] =
    Object.entries(bundle).find(([, output]) => {
      if (output.type !== "chunk") {
        return false;
      }

      return output.facadeModuleId?.endsWith(scriptFileName) ?? false;
    }) || [];

  if (!bundleFile || bundleFile.type !== "chunk") {
    return null;
  }

  return bundleFile;
}

export function getCssAssetForChunk(
  bundle: OutputBundle,
  outputChunk: OutputChunk
): OutputAsset | undefined {
  return Object.values(bundle).find((output) => {
    if (output.type !== "asset") {
      return false;
    }

    return output.name == `${outputChunk.name}.css`;
  }) as OutputAsset | undefined;
}

export function outputChunkHasImports(outputChunk: OutputChunk): boolean {
  return Boolean(
    outputChunk.imports.length || outputChunk.dynamicImports.length
  );
}

export function isSingleHtmlFilename(fileName: string): boolean {
  return /[^*]+.html$/.test(fileName);
}
