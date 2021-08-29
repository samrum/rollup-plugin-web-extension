import { validateFixture, validateTypescriptFixture } from "./util/fixtureValidation";
import * as JAVASCRIPT_TEST_FIXTURES from "./fixture/index/javascript";
import * as TYPESCRIPT_TEST_FIXTURES from "./fixture/index/typescript";

describe("Rollup Plugin Web Extension", () => {
  describe("JavaScript", () => {
    Object.entries(JAVASCRIPT_TEST_FIXTURES).forEach(([testName, fixture]) => {
      test(testName, async () => {
        await validateFixture(fixture);
      });
    });
  });

  describe("TypeScript", () => {
    Object.entries(TYPESCRIPT_TEST_FIXTURES).forEach(([testName, fixture]) => {
      test(testName, async () => {
        await validateTypescriptFixture(fixture);
      });
    });
  });
});
