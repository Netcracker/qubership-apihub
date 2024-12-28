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
  expected: Array<RecursiveMatcher<Diff>>,
): DiffMatcher {
  return expect.toIncludeSameMembers(expected)
}
