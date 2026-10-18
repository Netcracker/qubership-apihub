import type { TestSpecType } from '@netcracker/qubership-apihub-compatibility-suites'
import type { Diff } from '../../src'

declare global {
  namespace jest {
    interface SpecVersionPairCaseContext {
      suiteType: TestSpecType
      suiteId: string
      testId: string
      beforeVersion: string
      afterVersion: string
      diffs: Array<Diff>
      merged: unknown
    }

    interface It {
      /**
       * Jest-runner friendly wrapper that iterates over specification version pairs.
       *
       * For each pair, calls `getCompatibilitySuite(...)` with `specificationVersionPair` and runs `fn`.
       *
       * Usage:
       * - `test.caseForSpecVersionPairs(suiteType, '<testId>', '<suiteId>', fn)`
       * - `test.only.caseForSpecVersionPairs(...)`
       * - `test.skip.caseForSpecVersionPairs(...)`
       */
      caseForSpecVersionPairs(
        suiteType: TestSpecType,
        testId: string,
        suiteId: string,
        fn: (ctx: SpecVersionPairCaseContext) => Promise<void> | void,
      ): void
    }
  }
}

export {}
