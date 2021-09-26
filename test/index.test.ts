import {
  validateManifestV2Fixtures,
  validateManifestV3Fixtures,
} from "./util/fixtureValidation";
import * as JAVASCRIPT_MANIFESTV2_TESTS from "./fixture/index/javascript/manifestV2";
import * as MANIFESTV2_TYPESCRIPT_TESTS from "./fixture/index/manifestV2/typescript";
import * as JAVASCRIPT_MANIFESTV3_TESTS from "./fixture/index/javascript/manifestV3";

describe("Rollup Plugin Web Extension", () => {
  describe("JavaScript", () => {
    describe("ManifestV2", () => {
      validateManifestV2Fixtures(JAVASCRIPT_MANIFESTV2_TESTS);
    });

    describe("ManifestV3", () => {
      validateManifestV3Fixtures(JAVASCRIPT_MANIFESTV3_TESTS);
    });
  });

  describe("TypeScript", () => {
    describe("ManifestV2", () => {
      validateManifestV2Fixtures(MANIFESTV2_TYPESCRIPT_TESTS);
    });
  });
});
