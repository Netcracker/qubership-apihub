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
