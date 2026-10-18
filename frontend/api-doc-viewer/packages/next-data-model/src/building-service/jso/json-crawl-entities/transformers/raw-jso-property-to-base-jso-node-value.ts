import { JsoTreeNodeValue, JsoTreeNodeValueBase } from "@apihub/next-data-model/model/jso/tree/node-value"
import { JsoPropertyValueType, JsoPropertyValueTypes } from "@apihub/next-data-model/model/jso/types/node-value-type"
import { isDiffReplace } from "@netcracker/qubership-apihub-api-diff"
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
  JSON_SCHEMA_PROPERTY_ITEMS, JSON_SCHEMA_PROPERTY_MAXIMUM, JSON_SCHEMA_PROPERTY_MAX_ITEMS,
  JSON_SCHEMA_PROPERTY_MAX_LENGTH,
  JSON_SCHEMA_PROPERTY_MAX_PROPERTIES, JSON_SCHEMA_PROPERTY_MINIMUM, JSON_SCHEMA_PROPERTY_MIN_ITEMS,
  JSON_SCHEMA_PROPERTY_MIN_LENGTH,
  JSON_SCHEMA_PROPERTY_MIN_PROPERTIES, JSON_SCHEMA_PROPERTY_MULTIPLE_OF,
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
import { isObject, isObjective, takeIfDiffsRecord } from "../../../../utilities"

export class JsoRawValueUtilities {
  public static readonly DEFAULT_BASE_JSO_NODE_VALUE: JsoTreeNodeValueBase = {
    title: '',
    value: undefined,
    valueType: JsoPropertyValueTypes.UNKNOWN,
    isPrimitive: false,
    isArrayItem: false,
    isPredefinedValueSet: false,
  }

  public static transformRawJsoPropertyToBaseJsoNodeValue(key: PropertyKey | undefined | null, value: unknown): JsoTreeNodeValue {
    const title = (
      key === undefined || key === null
        ? ''
        : typeof key === 'symbol'
          ? key.toString()
          : `${key}`
    )
    const isArrayItem = JsoRawValueUtilities.isArrayItemKey(key)
    return JsoRawValueUtilities.transformRawJsoValueToBaseJsoNodeValue(value, title, isArrayItem)
  }

  private static isArrayItemKey(key: PropertyKey | null | undefined): boolean {
    if (key === undefined || key === null) {
      return false
    }
    if (typeof key === 'string') {
      return Number.parseInt(key) >= 0
    }
    if (typeof key === 'number') {
      return key >= 0
    }
    return true
  }

  public static transformRawJsoValueToBaseJsoNodeValue(value: unknown, title: string = '', isArrayItem: boolean = false): JsoTreeNodeValueBase {
    const valueType = JsoRawValueUtilities.getValueType(value)
    const isPrimitive = JsoRawValueUtilities.isPrimitiveValue(valueType)
    return {
      title,
      value,
      valueType,
      isPrimitive,
      isArrayItem,
      isPredefinedValueSet: JsoRawValueUtilities.isPredefinedValueSet(valueType),
    }
  }

  public static isPredefinedValueSet(valueType: JsoPropertyValueType): boolean {
    return valueType === JsoPropertyValueTypes.BOOLEAN || valueType === JsoPropertyValueTypes.NULL
  }

  public static isPrimitiveValue(valueType: JsoPropertyValueType): boolean {
    return (
      valueType !== JsoPropertyValueTypes.JSON_SCHEMA &&
      valueType !== JsoPropertyValueTypes.MULTI_SCHEMA &&
      valueType !== JsoPropertyValueTypes.OBJECT &&
      valueType !== JsoPropertyValueTypes.ARRAY
    )
  }

  public static getValueType(value: unknown): JsoPropertyValueType {
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
      if (JsoRawValueUtilities.isJsonSchema(value)) {
        return JsoPropertyValueTypes.JSON_SCHEMA
      }
      if (JsoRawValueUtilities.isMultiSchema(value)) {
        return JsoPropertyValueTypes.MULTI_SCHEMA
      }
      return JsoPropertyValueTypes.OBJECT
    }
    return JsoPropertyValueTypes.UNKNOWN
  }

  public static isJsonSchema(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) {
      return false
    }

    const hasFieldTypeFromJsonSchema = (
      (
        JSON_SCHEMA_PROPERTY_TYPE in value &&
        typeof (value as { type?: unknown }).type === 'string' &&
        JSON_SCHEMA_NODE_TYPES.some(type => type === (value as { type: string }).type)
      ) || (
        JSON_SCHEMA_PROPERTY_ONE_OF in value &&
        Array.isArray((value as { oneOf?: unknown }).oneOf) &&
        (value as { oneOf: unknown[] }).oneOf.every(item => JsoRawValueUtilities.isJsonSchema(item))
      ) || (
        JSON_SCHEMA_PROPERTY_ANY_OF in value &&
        Array.isArray((value as { anyOf?: unknown }).anyOf) &&
        (value as { anyOf: unknown[] }).anyOf.every(item => JsoRawValueUtilities.isJsonSchema(item))
      ) || (
        JSON_SCHEMA_PROPERTY_ALL_OF in value &&
        Array.isArray((value as { allOf?: unknown }).allOf) &&
        (value as { allOf: unknown[] }).allOf.every(item => JsoRawValueUtilities.isJsonSchema(item))
      ) || (
        JSON_SCHEMA_PROPERTY_REF in value &&
        typeof (value as { $ref?: unknown }).$ref === 'string' &&
        (value as { $ref: string }).$ref.startsWith('#/')
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
      Object.keys(value as object).every(key => (
        JSON_SCHEMA_PROPERTY_KEYS.has(key) ||
        JsoRawValueUtilities.isExtensionPropertyInJsonSchema(key) ||
        JsoRawValueUtilities.isAllowedCustomPropertyInJsonSchema(key)
      ))
    )
  }

  private static isAllowedCustomPropertyInJsonSchema(key: string): boolean {
    return key === 'location'
  }

  private static isExtensionPropertyInJsonSchema(key: string): boolean {
    return key.startsWith('x-')
  }

  public static isMultiSchema(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) {
      return false
    }
    if (
      'schemaFormat' in value &&
      typeof (value as { schemaFormat?: unknown }).schemaFormat === 'string' &&
      'schema' in value &&
      isObject((value as { schema?: unknown }).schema)
    ) {
      return true
    }
    return false
  }

  public static mergeComparisonBetweenArrayAndObject(
    value: unknown,
    diffsMetaKey: symbol,
  ): unknown {
    if (!isObjective(value)) {
      return value
    }

    const diffsRecord = takeIfDiffsRecord(value[diffsMetaKey])
    if (!diffsRecord) {
      return value
    }

    const valueKeys = new Set<string>(Object.keys(value))
    const valueDiffsKeys = new Set<string>(Object.keys(diffsRecord))
    const commonKeys: Set<string> = valueKeys.intersection(valueDiffsKeys)

    const mergedValue: Record<PropertyKey, unknown> = { ...value }

    for (const key of commonKeys) {
      const valueItem = value[key]
      const valueDiffItem = diffsRecord[key]
      if (valueItem === undefined || valueDiffItem === undefined) {
        continue
      }

      if (!isDiffReplace(valueDiffItem)) {
        continue
      }

      const { beforeValue, afterValue } = valueDiffItem
      const isBeforeValueObject = isObject(beforeValue)
      const isBeforeValueArray = Array.isArray(beforeValue)
      const isAfterValueObject = isObject(afterValue)
      const isAfterValueArray = Array.isArray(afterValue)

      const isChangeBetweenArrayAndObject =
        isBeforeValueArray && isAfterValueObject ||
        isBeforeValueObject && isAfterValueArray

      if (!isChangeBetweenArrayAndObject) {
        continue
      }

      const mergedValueItem: Record<PropertyKey, unknown> = { ...beforeValue, ...afterValue }
      mergedValue[key] = mergedValueItem
    }

    return mergedValue
  }
}
