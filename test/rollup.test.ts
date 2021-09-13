import { addInputScriptsToOptionsInput } from "./../src/rollup";

describe("Rollup", () => {
  describe("addInputScriptsToOptionsInput", () => {
    it("Adds input scripts to string input", () => {
      expect(
        addInputScriptsToOptionsInput("src/index.js", [
          ["outputFile.js", "inputFile.js"],
        ])
      ).toEqual({
        "src/index.js": "src/index.js",
        "outputFile.js": "inputFile.js",
      });
    });

    it("Adds input scripts to array input", () => {
      expect(
        addInputScriptsToOptionsInput(
          ["src/index.js", "src/index2.js"],
          [["outputFile.js", "inputFile.js"]]
        )
      ).toEqual({
        "src/index.js": "src/index.js",
        "src/index2.js": "src/index2.js",
        "outputFile.js": "inputFile.js",
      });
    });

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
});
