import type { RollupOptions, OutputAsset, OutputChunk } from "rollup";

export function getOptionsInputAsObject(input: RollupOptions["input"]): {
  [entryAlias: string]: string;
} {
  if (typeof input === "string") {
    if (!input.trim()) {
      return {};
    }

    return {
      [input]: input,
    };
  } else if (input instanceof Array) {
    if (!input.length) {
      return {};
    }

    const inputObject: { [entryAlias: string]: string } = {};

    input.forEach((input) => (inputObject[input] = input));

    return inputObject;
  }

  return input ?? {};
}

export function addInputScriptsToOptionsInput(
  optionsInput: { [entryAlias: string]: string },
  inputScripts: [string, string][]
): { [entryAlias: string]: string } {
  inputScripts.forEach(
    ([output, input]) =>
      ((optionsInput as { [entryAlias: string]: string })[output] = input)
  );

  return optionsInput;
}

export function isOutputChunk(
  bundleFile: OutputAsset | OutputChunk
): bundleFile is OutputChunk {
  return "imports" in bundleFile;
}
