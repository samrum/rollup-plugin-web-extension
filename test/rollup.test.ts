import {
  getOptionsInputAsObject,
  addInputScriptsToOptionsInput,
} from "./../src/rollup";

describe("getOptionsInputAsObject", () => {
  it("Transforms string input to object", () => {
    expect(getOptionsInputAsObject("src/index.js")).toEqual({
      "src/index.js": "src/index.js",
    });
  });

  it("Transforms array input to object", () => {
    expect(getOptionsInputAsObject(["src/index.js", "src/index2.js"])).toEqual({
      "src/index.js": "src/index.js",
      "src/index2.js": "src/index2.js",
    });
  });

  it("Returns original object input", () => {
    const input = {
      "src/indexOut.js": "src/index.js",
      "src/index2Out.js": "src/index2.js",
    };

    expect(getOptionsInputAsObject(input)).toEqual(input);
  });
});

describe("addInputScriptsToOptionsInput", () => {
  it("Adds input scripts to empty options input object", () => {
    expect(
      addInputScriptsToOptionsInput({}, [["outputFile.js", "inputFile.js"]])
    ).toEqual({
      "outputFile.js": "inputFile.js",
    });
  });

  it("Adds input scripts to options input object with existing entries", () => {
    expect(
      addInputScriptsToOptionsInput(
        {
          "outputFile.js": "inputFile.js",
        },
        [["outputFile2.js", "inputFile2.js"]]
      )
    ).toEqual({
      "outputFile.js": "inputFile.js",
      "outputFile2.js": "inputFile2.js",
    });
  });
});
