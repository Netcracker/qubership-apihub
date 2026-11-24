import type { JSONSchema } from '@stoplight/spectral-core'
import { Resolver } from '@stoplight/json-ref-resolver'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { MethodType } from '@netcracker/qubership-apihub-ui-shared/entities/method-types'
import { JSON_FILE_FORMAT, YAML_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { OpenapiSchema, PathItemObject, SpecItemUri } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'
import { toJsonSchema, toYaml } from '@netcracker/qubership-apihub-ui-shared/utils/specifications'

export type SpecPathKey = [Key, MethodType]

export async function resolveRefs(value: string): Promise<OpenapiSchema> {
  const resolver = new Resolver()
  const { result } = await resolver.resolve(toJsonSchema(value))
  return result
}

export function isPathItemObject(schema: JSONSchema): schema is Record<Key, PathItemObject> {
  return 'get' in schema || 'post' in schema || 'patch' in schema || 'delete' in schema
}

export function generateSpecificationByPathItems(
  fileFormat: typeof JSON_FILE_FORMAT | typeof YAML_FILE_FORMAT,
  value: string,
): [string, AddedLineCount, SpecItemUri] | null {
  const pathItemObject = toJsonSchema(value)
  if (!pathItemObject || !isPathItemObject(pathItemObject)) {
    return null
  }

  const itemUri: SpecItemUri = `/paths/~1/${Object.keys(pathItemObject)[0]}`

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
