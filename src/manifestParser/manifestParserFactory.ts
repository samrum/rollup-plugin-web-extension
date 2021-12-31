import ManifestParser, { ManifestParserConfig } from "./manifestParser";
import ManifestV2 from "./manifestV2";
import ManifestV3 from "./manifestV3";

export default class ManifestParserFactory {
  static getParser(
    manifestVersion: number | undefined,
    parserConfig: ManifestParserConfig
  ): ManifestParser<chrome.runtime.Manifest> {
    switch (manifestVersion) {
      case 2:
        return new ManifestV2(parserConfig);
      case 3:
        return new ManifestV3(parserConfig);
    }

    throw new Error(
      `No parser available for manifest_version ${manifestVersion ?? 0}`
    );
  }
}
