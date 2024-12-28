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

import { isObject } from '@netcracker/qubership-apihub-json-crawl'
import { OperationCrawlRules, SearchScopes } from '../types'

export const buildSearchScope = (key: PropertyKey, value: any, rules: OperationCrawlRules, scopes: SearchScopes): void => {
  let _value: any = value
  let dataScopes: string[] = []
  if ('#' in rules) {
    dataScopes = rules['#'] || []
    if (Array.isArray(value)) {
      _value = value.join(' ')
    } else if (isObject(value)) {
      const { $ref, ...rest } = value
      _value = JSON.stringify(rest)
    } else if (typeof value === 'boolean') {
      _value = String(key)
    } else if (typeof value === 'number') {
      _value = String(value)
    }
  } else if ('##' in rules && key) {
    dataScopes = rules['##'] || []
    _value = String(key)
  } else {
    return
  }

  if (!scopes.all) {
    scopes.all = new Set()
  }
  scopes.all.add(_value)
  for (const scope of dataScopes) {
    if (!scopes[scope]) {
      scopes[scope] = new Set()
    }
    scopes[scope].add(_value)
  }
}
