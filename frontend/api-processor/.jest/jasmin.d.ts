/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import CustomEqualityTester = jasmine.CustomEqualityTester
import 'jest-extended'

declare type ExpectedRecursive<T> = T | ObjectContaining<T> | AsymmetricMatcher<any> | {
  [K in keyof T]: ExpectedRecursive<T[K]> | Any;
};

export declare interface AsymmetricMatcher<TValue> {
  asymmetricMatch(other: TValue, customTesters: ReadonlyArray<CustomEqualityTester>): boolean;

  jasmineToString?(): string;
}

export declare interface Any extends AsymmetricMatcher<any> {
  (...params: any[]): any; // jasmine.Any can also be a function
  new(expectedClass: any): any;

  jasmineMatches(other: any): boolean;

  jasmineToString(): string;
}

export declare interface ArrayContaining<T> extends AsymmetricMatcher<any> {
  new?(sample: ArrayLike<T>): ArrayLike<T>;
}

export declare interface ObjectContaining<T> extends AsymmetricMatcher<any> {
  new?(sample: { [K in keyof T]?: any }): { [K in keyof T]?: any };

  jasmineMatches(other: any, mismatchKeys: any[], mismatchValues: any[]): boolean;

  jasmineToString?(): string;
}

export type RecursiveMatcher<T> = {
  [P in keyof T]?: T[P] extends (infer U)[] ? ArrayContaining<ExpectedRecursive<U>> :
    T[P] extends object[] ? ExpectedRecursive<T[P]> :
      T[P];
}
