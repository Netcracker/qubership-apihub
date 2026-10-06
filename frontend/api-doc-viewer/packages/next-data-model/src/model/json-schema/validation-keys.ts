import { JsonSchemaTreeNodeStoredValue } from "@apihub/next-data-model/model/json-schema/types/node-value"
import {
  JsonSchemaValidationKey,
  JsonSchemaValidationKeys,
} from "@apihub/next-data-model/model/json-schema/types/validation-key"
import { asJsonSchemaTypedNodeValue } from "@apihub/next-data-model/shared/json-schema/guards/schema-value"
import { isObject } from "@apihub/next-data-model/utilities"

function isDefined(value: unknown): value is NonNullable<unknown> {
  return value !== undefined && value !== null
}

/**
 * Union of the validation-relevant optional fields across every JSON Schema value-type shape
 * (`JsonSchemaTreeNodeValueTypeString/Number/Object/Array`). A merged node value only ever
 * carries the fields for its own `type`, so this view lets callers read any of them without
 * per-shape type assertions - see {@link resolveJsonSchemaValidationFieldsView}.
 */
export type JsonSchemaValidationFieldsView = {
  readonly minLength?: number
  readonly maxLength?: number
  readonly pattern?: string
  readonly minimum?: number
  readonly maximum?: number
  readonly exclusiveMinimum?: number | boolean
  readonly exclusiveMaximum?: number | boolean
  readonly multipleOf?: number
  readonly minProperties?: number
  readonly maxProperties?: number
  readonly uniqueItems?: boolean
  readonly minItems?: number
  readonly maxItems?: number
}

/**
 * Safely reads the validation-relevant fields off a merged JSON Schema node value, regardless of
 * its `type`. Replaces per-shape `as JsonSchemaTreeNodeValueType*` casts at call sites - fields
 * that don't apply to the value's actual type are simply absent.
 */
export function resolveJsonSchemaValidationFieldsView(
  value: unknown,
): JsonSchemaValidationFieldsView {
  if (!isObject(value)) {
    return {}
  }

  const fields: { -readonly [K in keyof JsonSchemaValidationFieldsView]: JsonSchemaValidationFieldsView[K] } = {}
  if (typeof value.minLength === "number") fields.minLength = value.minLength
  if (typeof value.maxLength === "number") fields.maxLength = value.maxLength
  if (typeof value.pattern === "string") fields.pattern = value.pattern
  if (typeof value.minimum === "number") fields.minimum = value.minimum
  if (typeof value.maximum === "number") fields.maximum = value.maximum
  if (typeof value.exclusiveMinimum === "number" || typeof value.exclusiveMinimum === "boolean") {
    fields.exclusiveMinimum = value.exclusiveMinimum
  }
  if (typeof value.exclusiveMaximum === "number" || typeof value.exclusiveMaximum === "boolean") {
    fields.exclusiveMaximum = value.exclusiveMaximum
  }
  if (typeof value.multipleOf === "number") fields.multipleOf = value.multipleOf
  if (typeof value.minProperties === "number") fields.minProperties = value.minProperties
  if (typeof value.maxProperties === "number") fields.maxProperties = value.maxProperties
  if (typeof value.uniqueItems === "boolean") fields.uniqueItems = value.uniqueItems
  if (typeof value.minItems === "number") fields.minItems = value.minItems
  if (typeof value.maxItems === "number") fields.maxItems = value.maxItems
  return fields
}

export function resolveValidationKeysForType(
  value: JsonSchemaTreeNodeStoredValue | null | undefined,
): JsonSchemaValidationKey[] {
  const typedValue = asJsonSchemaTypedNodeValue(value)
  if (!typedValue) {
    return []
  }

  const keys: JsonSchemaValidationKey[] = []
  const fields = resolveJsonSchemaValidationFieldsView(typedValue)

  if (fields.minLength !== undefined) {
    keys.push(JsonSchemaValidationKeys.MIN_LENGTH)
  }
  if (fields.maxLength !== undefined) {
    keys.push(JsonSchemaValidationKeys.MAX_LENGTH)
  }
  if (fields.pattern !== undefined) {
    keys.push(JsonSchemaValidationKeys.PATTERN)
  }

  if (fields.minimum !== undefined) {
    keys.push(JsonSchemaValidationKeys.MINIMUM)
  }
  if (fields.maximum !== undefined) {
    keys.push(JsonSchemaValidationKeys.MAXIMUM)
  }
  if (isDefined(fields.exclusiveMinimum)) {
    keys.push(JsonSchemaValidationKeys.EXCLUSIVE_MINIMUM)
  }
  if (isDefined(fields.exclusiveMaximum)) {
    keys.push(JsonSchemaValidationKeys.EXCLUSIVE_MAXIMUM)
  }
  if (fields.multipleOf !== undefined) {
    keys.push(JsonSchemaValidationKeys.MULTIPLE_OF)
  }

  if (fields.minProperties !== undefined) {
    keys.push(JsonSchemaValidationKeys.MIN_PROPERTIES)
  }
  if (fields.maxProperties !== undefined) {
    keys.push(JsonSchemaValidationKeys.MAX_PROPERTIES)
  }

  if (fields.uniqueItems !== undefined) {
    keys.push(JsonSchemaValidationKeys.UNIQUE_ITEMS)
  }
  if (fields.minItems !== undefined) {
    keys.push(JsonSchemaValidationKeys.MIN_ITEMS)
  }
  if (fields.maxItems !== undefined) {
    keys.push(JsonSchemaValidationKeys.MAX_ITEMS)
  }

  return keys
}
