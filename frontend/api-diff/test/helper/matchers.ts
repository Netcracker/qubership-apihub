import { Diff } from '../../src'
import { CompareScope } from '../../src/types'
import { isObject } from '../../src/utils'
import 'jest-extended'
import {
  TEST_SPEC_TYPE_ASYNC_API,
  TEST_SPEC_TYPE_OPEN_API,
  TestSpecType,
} from '@netcracker/qubership-apihub-compatibility-suites'

import CustomEqualityTester = jasmine.CustomEqualityTester

type ExpectedRecursive<T> = T | ObjectContaining<T> | AsymmetricMatcher<any> | {
  [K in keyof T]: ExpectedRecursive<T[K]> | Any;
}

export interface AsymmetricMatcher<TValue> {
  asymmetricMatch(other: TValue, customTesters: ReadonlyArray<CustomEqualityTester>): boolean;

  jasmineToString?(): string;
}

export interface Any extends AsymmetricMatcher<any> {
  (...params: any[]): any; // jasmine.Any can also be a function
  new(expectedClass: any): any;

  jasmineMatches(other: any): boolean;

  jasmineToString(): string;
}

export interface ArrayContaining<T> extends AsymmetricMatcher<any> {
  new?(sample: ArrayLike<T>): ArrayLike<T>;
}

export interface ObjectContaining<T> extends AsymmetricMatcher<any> {
  new?(sample: { [K in keyof T]?: any }): { [K in keyof T]?: any };

  jasmineMatches(other: any, mismatchKeys: any[], mismatchValues: any[]): boolean;

  jasmineToString?(): string;
}

export type RecursiveMatcher<T> = {
  [P in keyof T]?: T[P] extends (infer U)[] ? ArrayContaining<ExpectedRecursive<U>> :
  T[P] extends object[] ? ExpectedRecursive<T[P]> :
  T[P];
}

export type DiffMatcher = ArrayContaining<Diff> & Diff[]

const DIFF_MATCHER_SKIP = Symbol('DIFF_MATCHER_SKIP')

export function diffDescriptionMatcher(
  description: string
): DiffMatcher {
  return diffsMatcher([
    expect.objectContaining({
      description: description,
    }),
  ])
}

export function diffsMatcher(
  expected: Array<RecursiveMatcher<Diff> | typeof DIFF_MATCHER_SKIP>,
  skipScopes: Set<CompareScope> = new Set(),
): DiffMatcher {
  const compactExpected = expected.filter(
    (value): value is RecursiveMatcher<Diff> => value !== DIFF_MATCHER_SKIP,
  )
  const inner = expect.toIncludeSameMembers(compactExpected)
  return {
    $$typeof: Symbol.for('jest.asymmetricMatcher'),
    asymmetricMatch(actual: Diff[]) {
      const filteredActual = actual.filter(diff => !skipScopes.has(diff.scope))
      return inner.asymmetricMatch(filteredActual)
    },
    toString() {
      return 'DiffsMatcher'
    },
    toAsymmetricMatcher() {
      const itemStrings = compactExpected.map(item => {
        if (isObject(item) && 'toAsymmetricMatcher' in item && typeof (item as any).toAsymmetricMatcher === 'function') {
          return (item as any).toAsymmetricMatcher()
        }
        try {
          return JSON.stringify(item, null, 2)
        } catch {
          return String(item)
        }
      })
      return `DiffsMatcher (skipScopes: [${[...skipScopes].join(', ')}]) [\n  ${itemStrings.join(',\n  ')}\n]`
    },
  } as unknown as DiffMatcher
}

/**
 * Generic spec-version-change matcher. Returns a diff matcher for the root version key change,
 * or DIFF_MATCHER_SKIP when versions are equal (no version change diff expected).
 */
export const expectSpecVersionChange = (
  suiteType: TestSpecType,
  fromVersion: string,
  toVersion: string,
) => {
  if (fromVersion === toVersion) {
    return DIFF_MATCHER_SKIP
  }

  let rootKey: string
  switch (suiteType) {
    case TEST_SPEC_TYPE_OPEN_API:
      rootKey = 'openapi'
      break
    case TEST_SPEC_TYPE_ASYNC_API:
      rootKey = 'asyncapi'
      break
    default:
      // GraphQL and unknown types have no root version key to match
      return DIFF_MATCHER_SKIP
  }

  return expect.objectContaining({
    action: 'replace',
    afterDeclarationPaths: [[rootKey]],
    afterValue: toVersion,
    beforeDeclarationPaths: [[rootKey]],
    beforeValue: fromVersion,
    type: 'annotation',
  })
}

/**
 * Backward-compatible thin wrapper for OpenAPI version change matching.
 * Non-schema tests can continue using this without changes.
 */
export const expectOpenApiVersionChange = (fromVersion: string = '3.0.4', toVersion: string = '3.1.0') => {
  return expectSpecVersionChange(TEST_SPEC_TYPE_OPEN_API, fromVersion, toVersion)
}
