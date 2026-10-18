import { isArray } from '@netcracker/qubership-apihub-json-crawl'
import { SchemaTransformFunc } from '../abstract/types'
import { isObject } from '../utils'
import { JsonSchemaCrawlState } from './tree/types'
import { isOpenApiExtensionKey, OpenApiExtensionKey } from '../oas-extension-key'

export const transformExample: SchemaTransformFunc<JsonSchemaCrawlState> = (value) => {
  if (!isObject(value) || isArray(value)) {
    return value
  }
  // 1. convert example to array of examples
  // apihub-doc-viewer supports 'examples', but openapi spec allows only 'example'
  if ('example' in value && !('examples' in value)) {
    const { example } = value
    value['examples'] = [example]
    return value
    //todo transform changes? Fix when case
  }
  return value
}

export function transformJsonSchemaExtensions(value: unknown): unknown {
  if (!isObject(value) || isArray(value)) {
    return value
  }
  const allKeys = Reflect.ownKeys(value)
  const extensionKeys = allKeys.filter((key): key is string => typeof key === 'string' && key.startsWith('x-'))
  if (extensionKeys.length === 0) {
    return value
  }
  const extensionKeysSet = new Set(extensionKeys)
  const extensions: Record<OpenApiExtensionKey, unknown> = extensionKeys.reduce((extensionsRecord, extensionKey) => {
    if (!isOpenApiExtensionKey(extensionKey)) { return extensionsRecord }
    extensionsRecord[extensionKey] = value[extensionKey]
    return extensionsRecord
  }, {} as Record<OpenApiExtensionKey, unknown>)
  const result: Record<PropertyKey, unknown> = {}
  for (const key of allKeys) {
    if (typeof key === 'string' && extensionKeysSet.has(key)) {
      continue
    }
    result[key] = value[key]
  }
  result.extensions = extensions
  return result
}

export const jsonSchemaTransformers = [
  transformExample,
  transformJsonSchemaExtensions,
]
