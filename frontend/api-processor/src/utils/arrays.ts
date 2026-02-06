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

import { DEFAULT_BATCH_SIZE } from '../consts'
import { paginateArray } from './builder'

export const isEmpty = (array: Array<unknown>): boolean => {
  return array?.length === 0
}

export const isNotEmpty = (array: Array<unknown>): boolean => {
  return !isEmpty(array)
}

export async function executeInBatches<T>(
  array: Array<T>,
  callback: (batch: T[]) => Promise<void>,
  batchSize = DEFAULT_BATCH_SIZE,
): Promise<void> {
  let processedCount = 0

  while (processedCount < array.length) {
    const batch = paginateArray<T>(array, processedCount / batchSize + 1, batchSize)

    await callback(batch)

    processedCount += batch.length
  }
}

export function getDuplicatedElementsArray(it: string[], that: string[]): string[] {
  const duplicatedArray = []

  const first = new Set(it)
  const second = new Set(that)
  for (const currentElement of second.values()) {
    if (first.has(currentElement)) {
      duplicatedArray.push(currentElement)
    }
  }

  return duplicatedArray
}

export function keyBy<T>(array: Array<T>, keyFn: (value: T) => string): Record<string, T> {
  return (array || []).reduce((r, x) => ({
    ...r,
    [keyFn(x)]: x,
  }), {})
}

export type ArrayType<T> = T extends (infer U)[] ? U : T


export function intersection(array1: string[], array2: string[]): string[] {
  const set2 = new Set(array2)
  return [...new Set(array1.filter(x => set2.has(x)))]
}

export function difference(array1: string[], array2: string[]): string[] {
  const set2 = new Set(array2)
  return [...new Set(array1.filter(x => !set2.has(x)))]
}
