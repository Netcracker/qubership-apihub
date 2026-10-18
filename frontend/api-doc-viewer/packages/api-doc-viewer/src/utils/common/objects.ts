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

import { isObject } from '@netcracker/qubership-apihub-api-data-model'

export function safePropertyIn(value: unknown, key: PropertyKey, context?: string): boolean {
  try {
    return !!value && typeof value === 'object' && key in value
  } catch (error) {
    console.error(`[Caught Error] In ${context ?? 'safePropertyIn'}:`, error, 'on value:', value)
    return false
  }
}

export class ObjectUtils {

  public static get(source: unknown, path: PropertyKey[] = []): unknown {
    if (!isObject(source)) {
      return undefined
    }

    let result: unknown = source
    for (const pathItem of path) {
      if (isObject(result) && safePropertyIn(result, pathItem, 'ObjectUtils.get')) {
        result = result[pathItem]
        continue
      }
      return undefined
    }
    return result
  }

}