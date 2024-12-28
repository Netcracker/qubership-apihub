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

// TODO: Replace with standard `groupBy`/`groupByToMap`
//  Details: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/groupBy, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/groupByToMap
/* eslint-disable @typescript-eslint/no-explicit-any */

export function groupBy<T extends ReadonlyArray<any>>(
  array: T,
  key: string,
): Record<string, T> {
  return array.reduce(
    (previousValue, currentValue) => {
      (previousValue[currentValue[key]] = previousValue[currentValue[key]] ?? []).push(currentValue)
      return previousValue
    },
    {},
  )
}

export function deduplicate<T>(array: ReadonlyArray<T>): T[] {
  return [...new Set(array)]
}

export function deduplicateByKey<T, K extends keyof T>(array: ReadonlyArray<T>, key: K): T[] {
  return Object.values(array.reduce<Record<string, T>>((previousValue, currentValue) => {
    const index = currentValue[key] as string
    if (previousValue[index] === undefined) {
      previousValue[index] = currentValue
    }
    return previousValue
  }, {}))
}

export function isEmpty(array: unknown): boolean {
  return array && Array.isArray(array) ? !array.length : true
}

export function isNotEmpty(array: unknown): boolean {
  return Boolean(array && Array.isArray(array) && array.length)
}

export function isEmptyMap(map: unknown): boolean {
  return Boolean(map && map instanceof Map && map.size === 0)
}

export function isNotEmptyMap(map: unknown): boolean {
  return Boolean(map && map instanceof Map && map.size !== 0)
}

export function isNotEmptyRecord<T extends Record<string, unknown>>(record: T): boolean {
  return Object.keys(record).length > 0
}

export function isNotEmptySet(set: unknown): boolean {
  return Boolean(set && set instanceof Set && set.size !== 0)
}

export function insertIntoArrayByIndex<T>(array: T[], item: T, index: number): T[] {
  array.splice(index, 0, item)
  return array
}

export function getLastItem<T>(array?: T[]): T | undefined {
  return array?.length ? array[array?.length - 1] : undefined
}
