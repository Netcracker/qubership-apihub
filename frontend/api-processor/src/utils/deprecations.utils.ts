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

import { DeprecateItem } from '../types'
import { ORIGINS_SYMBOL } from '../consts'
import { isObject, JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { Jso, JSON_SCHEMA_PROPERTY_DEPRECATED, pathItemToFullPath, resolveOrigins } from '@netcracker/qubership-apihub-api-unifier'

export const isOperationDeprecated = Symbol('deprecated-operation')

/**
 * Where a deprecation notice is declared, as full paths. The builders record it on a `DeprecateItem` at
 * publish time and the comparison recomputes it to recognize a removed element among those records, so
 * both sides must go through here to derive it the same way.
 */
export function deprecatedDeclarationPaths(value: Jso): JsonPath[] {
  return resolveOrigins(value, JSON_SCHEMA_PROPERTY_DEPRECATED, ORIGINS_SYMBOL)?.map(pathItemToFullPath) ?? []
}

/**
 * Cheap gate for the deprecation rules: with no notice in the document, no difference can reach them.
 * Not a check on the operations of `operationsMap`, whose published form omits `deprecatedItems` and
 * would pass the tests on a local registry while disabling the rules in production. Not
 * `calculateDeprecatedItems` either, which throws on the missing origins of a raw document.
 */
export function containsDeprecatedElement(document: unknown): boolean {
  const pending: unknown[] = [document]
  // a normalized document would be passed with resolved references, and those are cyclic
  const visited = new WeakSet<object>()
  while (pending.length) {
    const current = pending.pop()
    if (!isObject(current) || visited.has(current)) {
      continue
    }
    visited.add(current)
    if (!Array.isArray(current) && current[JSON_SCHEMA_PROPERTY_DEPRECATED]) {
      return true
    }
    for (const child of Object.values(current)) {
      pending.push(child)
    }
  }
  return false
}

export function isDeprecatedOperationItem(item: DeprecateItem): boolean {
  return !!(item as never)?.[isOperationDeprecated]
}

export function areDeprecatedOriginsNotEmpty(value: Record<PropertyKey, unknown>): boolean {
  const deprecatedOrigins = resolveOrigins(value, JSON_SCHEMA_PROPERTY_DEPRECATED, ORIGINS_SYMBOL)

  if (!deprecatedOrigins) {
    return false
  }

  return deprecatedOrigins.every(item => Object.keys(item).length > 0)
}
