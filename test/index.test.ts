import {
  validateManifestV2Fixtures,
  validateManifestV3Fixtures,
} from "./util/fixtureValidation";
import * as JAVASCRIPT_MANIFESTV2_TESTS from "./fixture/index/javascript/manifestV2";
import * as JAVASCRIPT_MANIFESTV3_TESTS from "./fixture/index/javascript/manifestV3";
import * as TYPESCRIPT_MANIFESTV2_TESTS from "./fixture/index/typescript/manifestV2";
import * as TYPESCRIPT_MANIFESTV3_TESTS from "./fixture/index/typescript/manifestV3";

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
      validateManifestV2Fixtures(TYPESCRIPT_MANIFESTV2_TESTS);
    });

    describe("ManifestV3", () => {
      validateManifestV3Fixtures(TYPESCRIPT_MANIFESTV3_TESTS);
    });
  });
});
