import {
  validateFixture,
  validateTypescriptFixture,
} from "./util/fixtureValidation";
import * as MANIFESTV2_JAVASCRIPT_TESTS from "./fixture/index/manifestV2/javascript";
import * as MANIFESTV2_TYPESCRIPT_TESTS from "./fixture/index/manifestV2/typescript";

describe("Rollup Plugin Web Extension", () => {
  describe("ManifestV2", () => {
    describe("JavaScript", () => {
      Object.entries(MANIFESTV2_JAVASCRIPT_TESTS).forEach(
        ([testName, fixture]) => {
          test(testName, async () => {
            await validateFixture(fixture);
          });
        }
      );
    });

    describe("TypeScript", () => {
      Object.entries(MANIFESTV2_TYPESCRIPT_TESTS).forEach(
        ([testName, fixture]) => {
          test(testName, async () => {
            await validateTypescriptFixture(fixture);
          });
        }
      );
    });
  });
});
