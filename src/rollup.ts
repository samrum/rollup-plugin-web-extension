import type { InputOptions, OutputAsset, OutputChunk } from "rollup";

export function addInputScriptsToOptionsInput(
  optionsInput: InputOptions["input"],
  inputScripts: [string, string][]
): { [entryAlias: string]: string } {
  const optionsInputObject = getOptionsInputAsObject(optionsInput);

  inputScripts.forEach(
    ([output, input]) => (optionsInputObject[output] = input)
  );

  return optionsInputObject;
}

function getOptionsInputAsObject(input: InputOptions["input"]): {
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

export function isOutputChunk(
  bundleFile: OutputAsset | OutputChunk
): bundleFile is OutputChunk {
  return "imports" in bundleFile;
}
