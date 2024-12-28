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
import type { DumpOptions } from 'js-yaml'
import { dump } from 'js-yaml'
import { Resolver } from '@stoplight/json-ref-resolver'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { MethodType } from '@netcracker/qubership-apihub-ui-shared/entities/method-types'
import type {
  OpenapiSchema,
  PathItemObject,
  SpecItemUri,
} from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import {
  toJsonSchema,
} from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import { JSON_FILE_FORMAT, YAML_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/utils/files'

export type SpecPathKey = [Key, MethodType]

export function isJsonSchema(data: JSONSchema | null): data is JSONSchema {
  return !!data && typeof data === 'object' && ['object', 'array', 'string', 'number', 'boolean', 'integer', 'null'].includes(data.type as string)
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

export async function resolveRefs(value: string): Promise<OpenapiSchema> {
  const resolver = new Resolver()
  const { result } = await resolver.resolve(toJsonSchema(value))
  return result
}

export function isPathItemObject(schema: JSONSchema): schema is Record<Key, PathItemObject> {
  return 'get' in schema || 'post' in schema || 'patch' in schema || 'delete' in schema || 'put' in schema
}

export function generateSpecificationByPathItems(
  fileFormat: typeof JSON_FILE_FORMAT | typeof YAML_FILE_FORMAT,
  value: string,
): [string, AddedLineCount, SpecItemUri] | null {
  const pathItemObject = toJsonSchema(value)
  if (!pathItemObject || !isPathItemObject(pathItemObject)) {
    return null
  }

  const itemUri = `/paths/~1/${Object.keys(pathItemObject)[0]}`

  if (fileFormat === YAML_FILE_FORMAT) {
    const content = toYaml({
      openapi: '3.0.0',
      info: {
        title: ' ',
        description: ' ',
        version: ' ',
        contact: {
          name: ' ',
          url: 'https://example.com',
          email: 'mail@example.com',
        },
        license: {
          name: ' ',
          url: 'https://example.com',
        },
      },
      servers: [{
        url: 'https://example.com',
      }],
      tags: [{
        name: ' ',
        description: ' ',
      }],
      paths: {
        '/': pathItemObject,
      },
    }) ?? ''
    return [content, 19, itemUri]
  }

  if (fileFormat === JSON_FILE_FORMAT) {
    const content = `{"openapi": "3.0.0", "info": {"title": " ", "description": " ", "version": " ", "contact": {"name": " ", "url": "https://example.com", "email": "mail@example.com"}, "license": {"name": " ", "url": "https://example.com"} }, "servers": [{"url": "https://example.com"}], "tags": [{"name": " ", "description": " "}], "paths": {"/": ${value}}}`
    return [content, 0, itemUri]
  }

  return null
}

export type AddedLineCount = number
