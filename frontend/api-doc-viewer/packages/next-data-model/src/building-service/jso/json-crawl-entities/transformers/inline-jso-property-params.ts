import { SchemaTransformFunc } from "@apihub/next-data-model/building-service/async-api/json-crawl-entities/transformers/types/types"
import { JsoPropertyValueType, JsoPropertyValueTypes } from "@apihub/next-data-model/model/jso/types/node-value-type"
import {
  JSON_SCHEMA_NODE_TYPES,
  JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS,
  JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES,
  JSON_SCHEMA_PROPERTY_ALL_OF,
  JSON_SCHEMA_PROPERTY_ANY_OF,
  JSON_SCHEMA_PROPERTY_CONST,
  JSON_SCHEMA_PROPERTY_CONTAINS,
  JSON_SCHEMA_PROPERTY_CONTENT_MEDIA_TYPE,
  JSON_SCHEMA_PROPERTY_DEFAULT,
  JSON_SCHEMA_PROPERTY_DEFINITIONS,
  JSON_SCHEMA_PROPERTY_DEFS,
  JSON_SCHEMA_PROPERTY_DEPENDENCIES,
  JSON_SCHEMA_PROPERTY_DEPRECATED,
  JSON_SCHEMA_PROPERTY_DESCRIPTION,
  JSON_SCHEMA_PROPERTY_ENUM,
  JSON_SCHEMA_PROPERTY_EXAMPLES,
  JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM,
  JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM,
  JSON_SCHEMA_PROPERTY_FORMAT,
  JSON_SCHEMA_PROPERTY_ITEMS,
  JSON_SCHEMA_PROPERTY_MAX_ITEMS,
  JSON_SCHEMA_PROPERTY_MAX_LENGTH,
  JSON_SCHEMA_PROPERTY_MAX_PROPERTIES,
  JSON_SCHEMA_PROPERTY_MAXIMUM,
  JSON_SCHEMA_PROPERTY_MIN_ITEMS,
  JSON_SCHEMA_PROPERTY_MIN_LENGTH,
  JSON_SCHEMA_PROPERTY_MIN_PROPERTIES,
  JSON_SCHEMA_PROPERTY_MINIMUM,
  JSON_SCHEMA_PROPERTY_MULTIPLE_OF,
  JSON_SCHEMA_PROPERTY_NOT,
  JSON_SCHEMA_PROPERTY_NULLABLE,
  JSON_SCHEMA_PROPERTY_ONE_OF,
  JSON_SCHEMA_PROPERTY_PATTERN,
  JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES,
  JSON_SCHEMA_PROPERTY_PROPERTIES,
  JSON_SCHEMA_PROPERTY_PROPERTY_NAMES,
  JSON_SCHEMA_PROPERTY_READ_ONLY,
  JSON_SCHEMA_PROPERTY_REF,
  JSON_SCHEMA_PROPERTY_REQUIRED,
  JSON_SCHEMA_PROPERTY_TITLE,
  JSON_SCHEMA_PROPERTY_TYPE,
  JSON_SCHEMA_PROPERTY_UNIQUE_ITEMS,
  JSON_SCHEMA_PROPERTY_WRITE_ONLY
} from "@netcracker/qubership-apihub-api-unifier"
import { isObject } from "../../../../utilities"
import { JsoTreeCrawlState } from "../state/types"
import { JsoTreeNodeValue } from "@apihub/next-data-model/model/jso/types/node-value"

export const inlineJsoPropertyParameters: SchemaTransformFunc<JsoTreeCrawlState> = (key, value): JsoTreeNodeValue => {
  const valueType = getValueType(value)
  const isPrimitive = isPrimitiveValue(valueType)
  return {
    title:
      key === undefined || key === null
        ? ''
        : typeof key === 'symbol'
          ? key.toString()
          : `${key}`,
    value: value,
    valueType: getValueType(value),
    isPrimitive: isPrimitive,
    isArrayItem: typeof key === 'number' && key >= 0,
    isPredefinedValueSet: valueType === JsoPropertyValueTypes.BOOLEAN || valueType === JsoPropertyValueTypes.NULL,
  }
}

function isPrimitiveValue(valueType: JsoPropertyValueType): boolean {
  return (
    valueType !== JsoPropertyValueTypes.JSON_SCHEMA &&
    valueType !== JsoPropertyValueTypes.MULTI_SCHEMA &&
    valueType !== JsoPropertyValueTypes.OBJECT &&
    valueType !== JsoPropertyValueTypes.ARRAY
  )
}

function getValueType(value: unknown): JsoPropertyValueType {
  if (typeof value === 'string') {
    return JsoPropertyValueTypes.STRING
  }
  if (typeof value === 'number') {
    return JsoPropertyValueTypes.NUMBER
  }
  if (typeof value === 'boolean') {
    return JsoPropertyValueTypes.BOOLEAN
  }
  if (typeof value === 'object') {
    if (value === null) {
      return JsoPropertyValueTypes.NULL
    }
    if (Array.isArray(value)) {
      return JsoPropertyValueTypes.ARRAY
    }
    if (isJsonSchema(value)) {
      return JsoPropertyValueTypes.JSON_SCHEMA
    }
    if (isMultiSchema(value)) {
      return JsoPropertyValueTypes.MULTI_SCHEMA
    }
    return JsoPropertyValueTypes.OBJECT
  }
  return JsoPropertyValueTypes.UNKNOWN
}

function isJsonSchema(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const hasFieldTypeFromJsonSchema = (
    (
      JSON_SCHEMA_PROPERTY_TYPE in value &&
      typeof value.type === 'string' &&
      JSON_SCHEMA_NODE_TYPES.some(type => type === value.type)
    ) || (
      JSON_SCHEMA_PROPERTY_ONE_OF in value &&
      Array.isArray(value.oneOf) &&
      value.oneOf.every(item => isJsonSchema(item))
    ) || (
      JSON_SCHEMA_PROPERTY_ANY_OF in value &&
      Array.isArray(value.anyOf) &&
      value.anyOf.every(item => isJsonSchema(item))
    ) || (
      JSON_SCHEMA_PROPERTY_ALL_OF in value &&
      Array.isArray(value.allOf) &&
      value.allOf.every(item => isJsonSchema(item))
    ) || (
      JSON_SCHEMA_PROPERTY_REF in value &&
      typeof value.$ref === 'string' &&
      value.$ref.startsWith('#/')
    )
  )
  const JSON_SCHEMA_PROPERTY_KEYS = new Set([
    JSON_SCHEMA_PROPERTY_TITLE,
    JSON_SCHEMA_PROPERTY_CONTENT_MEDIA_TYPE,
    JSON_SCHEMA_PROPERTY_CONST,
    JSON_SCHEMA_PROPERTY_PROPERTY_NAMES,
    JSON_SCHEMA_PROPERTY_CONTAINS,
    JSON_SCHEMA_PROPERTY_DEPENDENCIES,
    JSON_SCHEMA_PROPERTY_DEFS,
    JSON_SCHEMA_PROPERTY_TYPE,
    JSON_SCHEMA_PROPERTY_DESCRIPTION,
    JSON_SCHEMA_PROPERTY_FORMAT,
    JSON_SCHEMA_PROPERTY_DEFAULT,
    JSON_SCHEMA_PROPERTY_MULTIPLE_OF,
    JSON_SCHEMA_PROPERTY_MAXIMUM,
    JSON_SCHEMA_PROPERTY_EXCLUSIVE_MAXIMUM,
    JSON_SCHEMA_PROPERTY_MINIMUM,
    JSON_SCHEMA_PROPERTY_EXCLUSIVE_MINIMUM,
    JSON_SCHEMA_PROPERTY_MAX_LENGTH,
    JSON_SCHEMA_PROPERTY_MIN_LENGTH,
    JSON_SCHEMA_PROPERTY_PATTERN,
    JSON_SCHEMA_PROPERTY_MAX_ITEMS,
    JSON_SCHEMA_PROPERTY_MIN_ITEMS,
    JSON_SCHEMA_PROPERTY_UNIQUE_ITEMS,
    JSON_SCHEMA_PROPERTY_MAX_PROPERTIES,
    JSON_SCHEMA_PROPERTY_MIN_PROPERTIES,
    JSON_SCHEMA_PROPERTY_ITEMS,
    JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS,
    JSON_SCHEMA_PROPERTY_REQUIRED,
    JSON_SCHEMA_PROPERTY_ENUM,
    JSON_SCHEMA_PROPERTY_PROPERTIES,
    JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES,
    JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES,
    JSON_SCHEMA_PROPERTY_ALL_OF,
    JSON_SCHEMA_PROPERTY_ONE_OF,
    JSON_SCHEMA_PROPERTY_ANY_OF,
    JSON_SCHEMA_PROPERTY_NOT,
    JSON_SCHEMA_PROPERTY_NULLABLE,
    JSON_SCHEMA_PROPERTY_READ_ONLY,
    JSON_SCHEMA_PROPERTY_WRITE_ONLY,
    JSON_SCHEMA_PROPERTY_EXAMPLES,
    JSON_SCHEMA_PROPERTY_DEPRECATED,
    JSON_SCHEMA_PROPERTY_DEFINITIONS,
    JSON_SCHEMA_PROPERTY_REF,
  ])
  return (
    hasFieldTypeFromJsonSchema &&
    Object.keys(value).every(key => (
      JSON_SCHEMA_PROPERTY_KEYS.has(key) ||
      isExtensionPropertyInJsonSchema(key) || // extensions in JSON Schema
      isAllowedCustomPropertyInJsonSchema(key) // for AsyncAPI parameters
    ))
  )
}

function isAllowedCustomPropertyInJsonSchema(key: string): boolean {
  return key === 'location'
}

function isExtensionPropertyInJsonSchema(key: string): boolean {
  return key.startsWith('x-')
}

function isMultiSchema(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (
    'schemaFormat' in value &&
    typeof value.schemaFormat === 'string' &&
    'schema' in value &&
    isObject(value.schema)
  ) {
    return true
  }
  return false
}
