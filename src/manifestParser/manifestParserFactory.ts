import { ResolvedConfig } from "vite";
import ManifestParser from "./manifestParser";
import ManifestV2 from "./manifestV2";
import ManifestV3 from "./manifestV3";

export default class ManifestParserFactory {
  static getParser(
    manifestVersion: number | undefined,
    viteConfig: ResolvedConfig
  ):
    | ManifestParser<chrome.runtime.ManifestV2>
    | ManifestParser<chrome.runtime.ManifestV3> {
    switch (manifestVersion) {
      case 2:
        return new ManifestV2(viteConfig);
      case 3:
        return new ManifestV3(viteConfig);
    }

    throw new Error(
      `No parser available for manifest_version ${manifestVersion ?? 0}`
    );
  }
}
