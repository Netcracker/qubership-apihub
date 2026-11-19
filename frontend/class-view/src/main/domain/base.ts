export type Key = string;
export type OneLineText = string;
export type Color = string | number;// Object color, defines in hex or number. Example: #ffccaa | 0xffccaa
export type FontFamily = string;// name.
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;// name.
export type Integer = number;// Number.MIN_SAFE_INTEGER..Number.MAX_SAFE_INTEGER
export type Ratio = number;// 0..1
export type Zoom = number;
export type Pixel = number; // px
export type Length = number; //
export type Duration = Integer; // in milliseconds
export type None = undefined | null;
export type Optional<T> = T | None;
export type Size<T> = { readonly width: T, readonly height: T }
export type Point<T> = { readonly x: T, readonly y: T }
export type Insets<T> = { readonly left: T, readonly top: T, readonly right: T, readonly bottom: T }
export type OptionalMembers<T> = {
  [P in keyof T]?: Optional<T[P]>;
};
export type Cancelable = () => void;
export type UnwrapArray<A> = A extends unknown[] ? A[number] : A;
export type IsEqualFunction<A> = ((one: A, another: A) => boolean)
  & ((one: A[], another: A[]) => boolean)
  & ((one: Set<A>, another: Set<A>) => boolean)


