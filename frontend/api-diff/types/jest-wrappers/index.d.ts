import type { Diff } from '../../src'

declare global {
  namespace jest {
    interface OpenApiVersionPairCaseContext {
      suiteId: string
      testId: string
      beforeVersion: string
      afterVersion: string
      diffs: Array<Diff>
      merged: unknown
    }

    interface It {
      /**
       * Jest-runner friendly wrapper: first arg is the test name (used for `-t`), so it can match
       * the real generated per-pair tests (`${testId} (${pairTag})`).
       *
       * Usage:
       * - `test.caseForOpenApiVersionPairs('<testId>', '<suiteId>', fn)`
       * - `test.only.caseForOpenApiVersionPairs(...)`
       * - `test.skip.caseForOpenApiVersionPairs(...)`
       */
      caseForOpenApiVersionPairs(
        testId: string,
        suiteId: string,
        fn: (ctx: OpenApiVersionPairCaseContext) => Promise<void> | void,
      ): void
    }
  }
}

export {}
