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

import type { OpenAPIV3 } from 'openapi-types'
import { UNKNOWN_SCHEMA_TYPE } from './schema-graph-content'
import {
  JSON_SCHEMA_PROPERTY_ALL_OF,
  JSON_SCHEMA_PROPERTY_ANY_OF,
  JSON_SCHEMA_PROPERTY_ONE_OF,
  parseRef,
} from '@netcracker/qubership-apihub-api-unifier'

export const ALL_OF_COMBINER = JSON_SCHEMA_PROPERTY_ALL_OF
export const ONE_OF_COMBINER = JSON_SCHEMA_PROPERTY_ONE_OF
export const ANY_OF_COMBINER = JSON_SCHEMA_PROPERTY_ANY_OF
type Combiner = typeof ALL_OF_COMBINER | typeof ONE_OF_COMBINER | typeof ANY_OF_COMBINER
export const COMBINERS: Array<Combiner> = [ALL_OF_COMBINER, ONE_OF_COMBINER, ANY_OF_COMBINER]

export function calculatePropertyType(value: OpenAPIV3.SchemaObject): string {
  if (!value?.type) {
    const combinerUsed = COMBINERS.find(combiner => !!value?.[combiner])
    if (combinerUsed) {
      return combinerUsed === ALL_OF_COMBINER ? 'object'/*this wrong*/ : combinerUsed
    }

    return UNKNOWN_SCHEMA_TYPE
  }

  if (value.type === 'array') {
    const item = calculatePropertyType(value?.items as OpenAPIV3.SchemaObject)
    return `array[${item}]`
  }

  if (value.type === 'object') {
    if (!value?.title) {
      return 'object'
    }

    return `object<${value?.title}>`
  }

  return `${value?.type}${value?.format ? `<${value.format}>` : ''}`
}

export function calculateClassName(value: OpenAPIV3.SchemaObject): string {
  if (value?.title) {
    if (value?.oneOf) {
      return `${value?.title} (oneOf)`
    }
    if (value?.anyOf) {
      return `${value?.title} (anyOf)`
    }

    return value.title
  }

  return calculatePropertyType(value) ?? UNKNOWN_SCHEMA_TYPE
}

export const VISITOR_FLAG_TITLE = Symbol('$title')
export const VISITOR_FLAG_DEFAULTS = Symbol('$defaults')
export const VISITOR_FLAG_ORIGINS = Symbol('$origins')
export const VISITOR_FLAG_HASH = Symbol('$hash')
export const VISITOR_FLAG_INLINE_REFS = Symbol('$inline')

export const resolveSharedSchemaNames: (schema: OpenAPIV3.SchemaObject) => string[] | undefined = (schema) => {
  const schemaAsRecord = schema as Record<PropertyKey, unknown>
  const inlined: string[] = schemaAsRecord[VISITOR_FLAG_INLINE_REFS] as string[] ?? []
  const result = inlined.flatMap(ref => {
    const name = parseRef(ref).jsonPath.at(-1)?.toString()
    return name ? [name] : []
  })
  return result.length ? result : undefined
}

export type Optional<T> = T | null | undefined
