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

import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'

export function getFirstKey(object: object): string | undefined {
  const [key] = Object.keys(object)
  return key
}

export function takeIf(value: object, condition: boolean): object {
  return {
    ...(condition ? value : {}),
  }
}

export function takeIfDefined(value: object): object {
  const [propertyValue] = Object.values(value)
  const valueIsNotDefined = !value ||
    propertyValue === undefined ||
    propertyValue === null ||
    propertyValue === ''

  return {
    ...takeIf(value, !valueIsNotDefined),
  }
}

export const getKeyValue = (obj: unknown, ...path: JsonPath): unknown | undefined => {
  let value: unknown = obj
  for (const key of path) {
    if (!isSymbol(key) && Array.isArray(value) && typeof +key === 'number' && value.length < +key) {
      value = value[+key]
    } else if (isObject(value) && key in value) {
      value = value[key]
    } else {
      return
    }
    if (value === undefined) { return }
  }
  return value
}

export const isString = (value: unknown): value is string => {
  return typeof value === 'string'
}

export const isSymbol = (value: unknown): value is symbol => {
  return typeof value === 'symbol'
}

export const isObject = (value: unknown): value is Record<string | symbol, unknown> => {
  return typeof value === 'object' && value !== null
}

export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== undefined && value !== null
}

export const getSymbolValueIfDefined = <T extends object>(
  obj: T,
  symbol: symbol,
): unknown => {
  const symbolObj = obj as { [key: symbol]: unknown }

  return symbol in symbolObj ? symbolObj[symbol] : undefined
}

export const extractSymbolProperty = <T extends object>(
  obj: T,
  symbol: symbol,
): { [key: symbol]: unknown } => {
  const value = getSymbolValueIfDefined(obj, symbol)
  return value !== undefined ? { [symbol]: value } : {}
}

/**
 * A view of a discriminated union in which every member also declares the keys it lacks,
 * as optional and `undefined`. That makes it safe to destructure a field only some
 * members carry - which is otherwise TS2339, because TypeScript 5 onward preserves the
 * union across a spread instead of collapsing it to one object type.
 *
 * Unlike flattening the union into a single all-optional object, this keeps the union
 * intact, so narrowing still works downstream: after `if (diff.action === 'add')`,
 * `afterDeclarationPaths` is `JsonPath[]` rather than `JsonPath[] | undefined`.
 *
 * Annotating with this type is a plain assignment and is fully checked, unlike an
 * assertion, which would equally accept a misspelled key or a wrong type.
 *
 * Community utility, known as `FillKeys`:
 * https://dev.to/suin/introducing-fillkeys-utility-type-for-easier-destructuring-of-discriminated-unions-in-typescript-1h46
 * The underlying language limitation is microsoft/TypeScript#46318.
 *
 * Symbol keys are intentionally not filled - the api-diff types carry a
 * `[key: symbol]: unknown` metadata index signature, read via `getSymbolValueIfDefined`.
 */
export type FillKeys<T> = (
  (T extends T ? keyof T : never) extends infer AllKeys
    ? T extends T
      ? { [K in keyof T]: T[K] } & {
          [K in AllKeys extends keyof T ? never : AllKeys extends string ? AllKeys : never]?: undefined
        }
      : never
    : never
) extends infer U
  ? { [K in keyof U]: U[K] }
  : never
