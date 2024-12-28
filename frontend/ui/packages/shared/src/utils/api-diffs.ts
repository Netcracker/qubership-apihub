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

// TODO: Rename file
import { merge } from 'lodash-es'
import { safeParse } from '@stoplight/json'

export const GLOBAL_DIFF_META_KEY = Symbol('diffMeta')

//todo copy-paste from ADV and builder
export const getJsonValue = (source: unknown, ...path: PropertyKey[]): unknown => {
  if (!isObject(source)) {
    return undefined
  }

  let result: unknown = source
  for (const pathItem of path) {
    if (isObject(result) && pathItem in result) {
      result = result[pathItem]
      continue
    }
    return undefined
  }
  return result

}

function isObject(obj: unknown): obj is Record<PropertyKey, unknown> {
  return typeof obj === 'object' && obj !== null
}

export function getSchema(content: string | undefined): object | undefined {
  if (!content) {
    return undefined
  }
  return merge(safeParse(content))
}
