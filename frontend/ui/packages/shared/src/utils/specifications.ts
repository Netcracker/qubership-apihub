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

import type { JSONSchema } from '@stoplight/spectral-core'
import type { ILocation } from '@stoplight/types'
import { dump, type DumpOptions, load } from 'js-yaml'
import { getLocationForJsonPath, parseWithPointers } from '@stoplight/yaml'
import type { Key } from './types'

export type SpecItemUri = Key
export type SpecItemPath = Key[]

export type OpenapiSchema = Record<Key, never> & JSONSchema & {
  info?: SchemaObject
  paths?: Record<Key, PathItemObject>
  components?: {
    schemas?: Record<Key, ReferenceObject | SchemaObject>
    securitySchemes?: Record<Key, ReferenceObject | SchemaObject>
    links?: Record<Key, LinkObject | ReferenceObject>
    responses?: Record<Key, ResponseObject | ReferenceObject>
    parameters?: Record<Key, ParameterObject | ReferenceObject>
    requestBodies?: Record<Key, RequestBody | ReferenceObject>
    headers?: Record<Key, ReferenceObject | HeaderObject>
    examples?: Record<Key, ReferenceObject | ExampleObject>
    callbacks?: Record<Key, ReferenceObject | CallbackObject>
  }
  definitions?: Record<Key, ReferenceObject | SchemaObject>
}

export type Headers = Record<string, string>

export interface HeaderObject {
  // note: this extends ParameterObject, minus "name" & "in"
  type?: string // required
  description?: string
  required?: boolean
  schema: ReferenceObject | SchemaObject
}

export interface PathItemObject {
  $ref?: string
  operationId?: string
  summary?: string
  description?: string
  get?: OperationObject
  put?: OperationObject
  post?: OperationObject
  delete?: OperationObject
  options?: OperationObject
  head?: OperationObject
  patch?: OperationObject
  trace?: OperationObject // V3 ONLY
  parameters?: (ReferenceObject | ParameterObject)[]
}

export interface LinkObject {
  operationRef?: string
  operationId?: string
  parameters?: (ReferenceObject | ParameterObject)[]
  requestBody?: RequestBody
  description?: string
}

export interface OperationObject {
  description?: string
  tags?: string[] // unused
  summary?: string // unused
  operationId?: string
  parameters?: (ReferenceObject | ParameterObject)[]
  requestBody?: ReferenceObject | RequestBody
  responses?: Record<string, ReferenceObject | ResponseObject> // required
}

export interface CallbackObject {
  expression?: ParameterObject
}

export interface ExampleObject {
  summary?: string
  description?: string
  value?: never
  externalValue?: string
}

export interface ParameterObject {
  name?: string // required
  in?: 'query' | 'header' | 'path' | /* V3 */ 'cookie' | /* V2 */ 'formData' | /* V2 */ 'body' // required
  description?: string
  required?: boolean
  deprecated?: boolean
  schema?: ReferenceObject | SchemaObject // required
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'file' // V2 ONLY
  items?: ReferenceObject | SchemaObject // V2 ONLY
  enum?: string[] // V2 ONLY
}

export type ReferenceObject = { $ref: string }

export interface ResponseObject {
  description?: string
  headers?: Record<string, ReferenceObject | HeaderObject>
  schema?: ReferenceObject | SchemaObject // V2 ONLY
  links?: Record<string, ReferenceObject | LinkObject> // V3 ONLY
  content?: {
    // V3 ONLY
    [contentType: string]: { schema: ReferenceObject | SchemaObject }
  }
}

export interface RequestBody {
  description?: string
  content?: {
    [contentType: string]: { schema: ReferenceObject | SchemaObject }
  }
}

export interface SchemaObject {
  title?: string // ignored
  description?: string
  required?: string[]
  enum?: string[]
  type?: string // assumed "object" if missing
  items?: ReferenceObject | SchemaObject
  allOf?: SchemaObject
  properties?: Record<string, ReferenceObject | SchemaObject>
  default?: unknown
  additionalProperties?: boolean | ReferenceObject | SchemaObject
  nullable?: boolean // V3 ONLY
  oneOf?: (ReferenceObject | SchemaObject)[] // V3 ONLY
  anyOf?: (ReferenceObject | SchemaObject)[] // V3 ONLY
  format?: string // V3 ONLY
}

export function toJsonSchema(value: string): JSONSchema | null {
  let schema: JSONSchema | null
  try {
    schema = load(value) as JSONSchema
  } catch (e) {
    schema = null
  }
  return schema
}

export function isFastJsonSchema(data: unknown | null): data is JSONSchema {
  return !!data && typeof data === 'object' && ['object', 'array', 'string', 'number', 'boolean', 'integer', 'null'].includes((data as JSONSchema).type as string)
}

export function toOpenApiSchema(value: string): OpenapiSchema | null {
  const schema = toJsonSchema(value) as Record<Key, never>
  if (isOpenapiSchema(schema)) {
    return schema
  }
  return null
}

export function isOpenapi(schema: Record<Key, never>): boolean {
  return /3.+/.test(schema?.openapi || '')
}

export function isSwagger(schema: Record<Key, never>): boolean {
  return /2.+/.test(schema?.swagger || '')
}

export function isOpenapiSchema(schema: Record<Key, never>): schema is OpenapiSchema {
  return isOpenapi(schema) || isSwagger(schema)
}

export function toFormattedOpenApiPathName(value: string): string {
  return value.replaceAll(new RegExp('{\\w+}', 'g'), '•')
}

export function findPathLocation(
  content: string,
  specItemUri: SpecItemUri,
): ILocation | undefined {
  if (!specItemUri.includes('/')) {
    return undefined
  }

  return getLocationForJsonPath(
    parseWithPointers(content),
    specItemUri.split('/').map(decodeKey).slice(1),
  )
}

export function encodeKey(key: Key): Key {
  return key.replace(new RegExp('/', 'g'), '~1')
}

export function decodeKey(key: Key): Key {
  return key.replace(new RegExp('~1', 'g'), '/')
}

export function toYaml(value: unknown): string | null {
  let yaml: string | null
  try {
    yaml = dump(value, { noRefs: true } as DumpOptions)
  } catch (e) {
    yaml = null
  }
  return yaml
}
