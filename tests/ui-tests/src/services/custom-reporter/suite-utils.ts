import type { Suite, TestCase } from '@playwright/test/reporter'

const UNIT_TEST_FILE_SUFFIX = '.unit.test.ts'

function isUnitTestFile(test: TestCase): boolean {
  return test.location.file.endsWith(UNIT_TEST_FILE_SUFFIX)
}

/** True when every test in the suite is a `*.unit.test.ts` file (Unit project). */
export function isUnitTestSuite(suite: Suite): boolean {
  const tests = suite.allTests()
  if (tests.length === 0) {
    return false
  }
  return tests.every(isUnitTestFile)
}
