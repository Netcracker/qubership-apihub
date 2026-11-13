export type Key = Readonly<string>
export type PackageKey = Key
export type VersionKey = Key
export type OperationKey = Key
export type Color = string
export type Pixel = number

export function isBoolean(value: unknown): boolean {
  return typeof value === 'boolean'
}
