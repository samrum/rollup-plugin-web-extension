import {
  validateManifestV2Fixtures,
  validateManifestV3Fixtures,
} from "./util/fixtureValidation";
import * as MANIFESTV2_JAVASCRIPT_TESTS from "./fixture/index/manifestV2/javascript";
import * as MANIFESTV2_TYPESCRIPT_TESTS from "./fixture/index/manifestV2/typescript";
import * as MANIFESTV3_JAVASCRIPT_TESTS from "./fixture/index/manifestV3/javascript";

describe("Rollup Plugin Web Extension", () => {
  describe("ManifestV2", () => {
    describe("JavaScript", () => {
      validateManifestV2Fixtures(MANIFESTV2_JAVASCRIPT_TESTS);
    });

    describe("TypeScript", () => {
      validateManifestV2Fixtures(MANIFESTV2_TYPESCRIPT_TESTS);
    });
  });

  describe("ManifestV3", () => {
    describe("JavaScript", () => {
      validateManifestV3Fixtures(MANIFESTV3_JAVASCRIPT_TESTS);
    });
  });
});
