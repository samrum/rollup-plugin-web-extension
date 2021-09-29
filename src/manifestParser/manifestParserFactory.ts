import ManifestParser, { ManifestParserConfig } from "./manifestParser";
import ManifestV2 from "./manifestV2";
import ManifestV3 from "./manifestV3";

export default class ManifestParserFactory {
  static getParser(
    manifestVersion: number,
    parserConfig: ManifestParserConfig
  ): ManifestParser {
    switch (manifestVersion) {
      case 2:
        return new ManifestV2(parserConfig);
      case 3:
        return new ManifestV3();
    }

    throw new Error(
      `No parser available for manifest version ${manifestVersion}`
    );
  }
}
