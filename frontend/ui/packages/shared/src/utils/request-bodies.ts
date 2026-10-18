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

import { deepEqual } from 'fast-equals'

export function getOptionalBody(obj: object): object | undefined {
  Object.keys(obj).forEach((key) => {
    if (obj[key as keyof typeof obj] && typeof obj[key as keyof typeof obj] === 'object') {
      const childObject = getOptionalBody(obj[key as keyof typeof obj])
      if (childObject === undefined) {
        delete obj[key as keyof typeof obj]
      }
    } else if (obj[key as keyof typeof obj] === '' || obj[key as keyof typeof obj] === null || obj[key as keyof typeof obj] === undefined) {
      delete obj[key as keyof typeof obj]
    }
  })

  return Object.keys(obj).length > 0 || obj instanceof Array ? obj : undefined
}

export function getPatchedBody(value: unknown, oldValue: unknown): unknown {
  if (!value || !oldValue) {
    return value
  }

  const updatedFields = {}
  for (const field of Object.keys(value)) {
    const currentValue = (value as never)?.[field]
    const previousValue = (oldValue as never)?.[field]
    if (Array.isArray(currentValue)) {
      // JSON-Patch approach for arrays is not applicable.
      if (!deepEqual(currentValue, previousValue)) {
        Reflect.set(updatedFields, field, currentValue)
      }
    } else if (typeof currentValue === 'object') {
      const diffObject = getPatchedBody(currentValue, previousValue)
      diffObject && Object.keys(diffObject).length && Reflect.set(updatedFields, field, diffObject)
    } else if (currentValue !== previousValue) {
      Reflect.set(updatedFields, field, currentValue)
    }
  }
  return updatedFields
}
