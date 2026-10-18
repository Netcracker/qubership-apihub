import {
  JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS,
  JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES,
  JSON_SCHEMA_PROPERTY_ALL_OF,
  JSON_SCHEMA_PROPERTY_ANY_OF,
  JSON_SCHEMA_PROPERTY_ITEMS,
  JSON_SCHEMA_PROPERTY_ONE_OF,
  JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES,
  JSON_SCHEMA_PROPERTY_PROPERTIES,
} from "@netcracker/qubership-apihub-api-unifier"
import { JsonSchemaCrawlRule } from "@apihub/next-data-model/building-service/json-schema/json-crawl-entities/rules/types"
import { isArray, isObject } from "@apihub/next-data-model/utilities"

function hasNonEmptyObject(value: unknown): boolean {
  return isObject(value) && Reflect.ownKeys(value).length > 0
}

function hasNonEmptyArray(value: unknown): value is unknown[] {
  return isArray(value) && value.length > 0
}

/**
 * Predicts whether a schema fragment will produce tree children when crawled.
 * Used for lazy materialization at build time (not interactive expand).
 */
export function jsonSchemaHasOwnChildren(value: unknown, rules: JsonSchemaCrawlRule | undefined): boolean {
  void rules

  if (!isObject(value) && !isArray(value)) {
    return false
  }

  if (isArray(value)) {
    return value.length > 0
  }

  const schema = value as Record<string, unknown>

  if (hasNonEmptyArray(schema[JSON_SCHEMA_PROPERTY_ALL_OF])) {
    return true
  }
  if (hasNonEmptyArray(schema[JSON_SCHEMA_PROPERTY_ONE_OF])) {
    return true
  }
  if (hasNonEmptyArray(schema[JSON_SCHEMA_PROPERTY_ANY_OF])) {
    return true
  }
  if (hasNonEmptyObject(schema[JSON_SCHEMA_PROPERTY_PROPERTIES])) {
    return true
  }
  if (hasNonEmptyObject(schema[JSON_SCHEMA_PROPERTY_PATTERN_PROPERTIES])) {
    return true
  }

  const additionalProperties = schema[JSON_SCHEMA_PROPERTY_ADDITIONAL_PROPERTIES]
  if (additionalProperties !== undefined && additionalProperties !== false) {
    return true
  }

  if (schema[JSON_SCHEMA_PROPERTY_ITEMS] !== undefined) {
    return true
  }

  const additionalItems = schema[JSON_SCHEMA_PROPERTY_ADDITIONAL_ITEMS]
  if (additionalItems !== undefined && additionalItems !== false) {
    return true
  }

  return false
}
