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

export const ANY_PATH_SEGMENT = '*'

const TRIM_RULES = [
  ['servers', ANY_PATH_SEGMENT],
  ['paths', ANY_PATH_SEGMENT],
  ['components', ANY_PATH_SEGMENT, ANY_PATH_SEGMENT],
  ['security', ANY_PATH_SEGMENT],
  ['externalDocs'],
]

// removes excessive detail from path
export const trimPath = (path: JsonPath): JsonPath => {
  const rule = TRIM_RULES.find(rule => pathStartsWith(path, rule))
  return rule ? path.slice(0, rule.length) : path
}

export function pathMatchesWith(path: JsonPath, pathTemplate: JsonPath): boolean {
  if (path.length !== pathTemplate.length) {
    return false
  }

  return pathTemplate.every((pathItem, i) => path[i] === pathItem || pathItem === ANY_PATH_SEGMENT)
}

export function pathStartsWith(path: JsonPath, pathTemplate: JsonPath): boolean {
  return pathTemplate.every((pathItem, i) => path[i] === pathItem || pathItem === ANY_PATH_SEGMENT)
}

export function areDeclarationPathsEqual(firstItemDeclarationPaths: JsonPath[], secondItemDeclarationPaths: JsonPath[]): boolean {
  if (firstItemDeclarationPaths.length !== secondItemDeclarationPaths.length) {
    return false
  }

  const firstPathsSet = new Set(firstItemDeclarationPaths.map(path => JSON.stringify(path)))
  const secondPathsSet = new Set(secondItemDeclarationPaths.map(path => JSON.stringify(path)))

  if (firstPathsSet.size !== secondPathsSet.size) {
    return false
  }

  for (const item of firstPathsSet) {
    if (!secondPathsSet.has(item)) {
      return false
    }
  }

  return true
}

export const getValueByPath = (value: any, path: JsonPath): any => path.reduce((data, key) => data[key], value)

