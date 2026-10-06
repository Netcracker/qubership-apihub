import { JSON_SCHEMA_PROPERTY_REF } from "@netcracker/qubership-apihub-api-unifier"
import {
  JsonSchemaNodeValueType,
  JsonSchemaNodeValueTypes,
  JsonSchemaNodeValueTypesList,
} from "@apihub/next-data-model/model/json-schema/types/node-value-type"
import {
  JsonSchemaTreeNodeStoredValue,
  JsonSchemaTreeNodeValue,
} from "@apihub/next-data-model/model/json-schema/types/node-value"
import { isArray, isObject, isString } from "@apihub/next-data-model/utilities"

export function isJsonSchemaNodeType(type: unknown): type is JsonSchemaNodeValueType {
  if (!type || !isString(type)) {
    return false
  }
  return JsonSchemaNodeValueTypesList.some(jsonSchemaNodeType => jsonSchemaNodeType === type)
}

export function isBrokenRef(value: unknown): value is Record<typeof JSON_SCHEMA_PROPERTY_REF, unknown> {
  return isObject(value) && JSON_SCHEMA_PROPERTY_REF in value
}

function hasCombinerArray(value: Record<PropertyKey, unknown>, key: "allOf" | "oneOf" | "anyOf"): boolean {
  const combiner = value[key]
  return isArray(combiner) && combiner.length > 0
}

export function isJsonSchemaPrimitiveNodeValue(value: unknown): value is boolean {
  return typeof value === "boolean"
}

export function isJsonSchemaTypedNodeValue(
  value: unknown,
): value is JsonSchemaTreeNodeValue {
  return isObject(value) && !isArray(value)
}

export function asJsonSchemaTypedNodeValue(
  value: JsonSchemaTreeNodeStoredValue | null | undefined,
): JsonSchemaTreeNodeValue | null | undefined {
  if (value === null || value === undefined || typeof value === "boolean") {
    return null
  }
  return value
}

const JSON_SCHEMA_PRIMITIVE_VALUE_TYPES: readonly string[] = [
  JsonSchemaNodeValueTypes.STRING,
  JsonSchemaNodeValueTypes.NUMBER,
  JsonSchemaNodeValueTypes.INTEGER,
  JsonSchemaNodeValueTypes.BOOLEAN,
]

/**
 * True when `type` is a primitive JSON Schema `type` keyword value (string/number/integer/boolean).
 * Distinct from {@link isJsonSchemaPrimitiveNodeValue}, which checks whether the *node itself*
 * is a literal boolean schema (`true`/`false`), not the `type` keyword's value.
 */
export function isJsonSchemaPrimitiveValueType(type: string | undefined): boolean {
  return !!type && JSON_SCHEMA_PRIMITIVE_VALUE_TYPES.includes(type)
}

const JSON_SCHEMA_SPECIAL_VALUE_TYPES: readonly string[] = [
  JsonSchemaNodeValueTypes.ANY,
  JsonSchemaNodeValueTypes.NOTHING,
]

/**
 * True when `type` is one of the schema-merge pipeline's special `any`/`nothing` pseudo-`type`
 * values, rather than a real JSON Schema `type` keyword. These are synthesized onto a node's
 * merged `type` field by the underlying unify/`liftCombiners` merge (e.g. an `allOf` branch that
 * adds no real constraint reduces to `any`; an `allOf` intersecting mutually-exclusive branches,
 * such as an `array` option and a `string` option, reduces to `nothing`) - see
 * `additional-properties-node-value.ts` for the other place `any` is synthesized
 * (`additionalProperties: true`).
 *
 * Deliberately **not** folded into {@link isJsonSchemaPrimitiveValueType}: `any`/`nothing` are not
 * primitive JSON Schema `type` keyword values, they are special synthesized values. They do share
 * one consequence with real primitives that some callers care about - a node whose merged type is
 * `any` or `nothing` has no genuine nested children either, so a `type` transition to/from
 * `object`/`array` needs the same single-sided add/remove handling as a primitive<->complex
 * transition (see `resolveTypePrimitivenessCrossing` in
 * `building-service/json-schema/tree-with-diffs/node-diffs-data/node-diffs/kind-any.ts`, which
 * combines this guard with {@link isJsonSchemaPrimitiveValueType} for that purpose).
 */
export function isJsonSchemaSpecialValueType(type: string | undefined): boolean {
  return !!type && JSON_SCHEMA_SPECIAL_VALUE_TYPES.includes(type)
}

export function isJsonSchemaComplexValue(value: unknown): boolean {
  if (!isObject(value) || isArray(value)) {
    return false
  }
  return hasCombinerArray(value, "allOf")
    || hasCombinerArray(value, "oneOf")
    || hasCombinerArray(value, "anyOf")
}
