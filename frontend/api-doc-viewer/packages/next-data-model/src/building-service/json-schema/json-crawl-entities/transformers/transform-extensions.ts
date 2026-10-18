import { isArray, isObject } from "@apihub/next-data-model/utilities"
import {
  isOpenApiExtensionKey,
  OpenApiExtensionKey,
} from "@apihub/next-data-model/shared/json-schema/types/extension-key"

export function transformJsonSchemaExtensions(_key: PropertyKey, value: unknown): unknown {
  if (!isObject(value) || isArray(value)) {
    return value
  }
  const allKeys = Reflect.ownKeys(value)
  const extensionKeys = allKeys.filter((key): key is string => isOpenApiExtensionKey(key))
  if (extensionKeys.length === 0) {
    return value
  }
  const extensionKeysSet = new Set(extensionKeys)
  const extensions: Record<OpenApiExtensionKey, unknown> = extensionKeys.reduce((extensionsRecord, extensionKey) => {
    if (!isOpenApiExtensionKey(extensionKey)) {
      return extensionsRecord
    }
    extensionsRecord[extensionKey] = value[extensionKey]
    return extensionsRecord
  }, {} as Record<OpenApiExtensionKey, unknown>)
  const result: Record<PropertyKey, unknown> = {}
  for (const key of allKeys) {
    if (typeof key === "string" && extensionKeysSet.has(key)) {
      continue
    }
    result[key] = value[key]
  }
  result.extensions = extensions
  return result
}
