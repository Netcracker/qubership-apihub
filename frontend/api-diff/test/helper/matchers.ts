import { Diff } from '../../src'
import 'jest-extended'

import CustomEqualityTester = jasmine.CustomEqualityTester
import 'jest-extended'

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
): DiffMatcher {
  const compactExpected = expected.filter(
    (value): value is RecursiveMatcher<Diff> => value !== DIFF_MATCHER_SKIP,
  )
  return expect.toIncludeSameMembers(compactExpected)
}

export const expectOpenApiVersionChange = (fromVersion: string = '3.0.4', toVersion: string = '3.1.0') => {
  if (fromVersion === toVersion)
    {
      return DIFF_MATCHER_SKIP
    }

  return expect.objectContaining({
    action: 'replace',
    afterDeclarationPaths: [['openapi']],
    afterValue: toVersion,
    beforeDeclarationPaths: [['openapi']],
    beforeValue: fromVersion,
    type: 'annotation',
  })
}
