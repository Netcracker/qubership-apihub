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
