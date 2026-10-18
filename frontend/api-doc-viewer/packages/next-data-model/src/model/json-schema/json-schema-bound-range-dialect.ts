export type JsonSchemaBoundRangeInput = {
  min?: number
  max?: number
  exclusiveMin?: number | boolean
  exclusiveMax?: number | boolean
}

/**
 * JSON Schema dialect for bound-range rendering.
 *
 * - OAS 3.0 / Draft-04: exclusiveMinimum and exclusiveMaximum are boolean modifiers on minimum/maximum.
 * - OAS 3.1 / Draft 2020-12: exclusiveMinimum and exclusiveMaximum may be standalone numeric bounds.
 */
export const JsonSchemaBoundRangeDialect = {
  OAS_3_0_BOOLEAN_EXCLUSIVE: "oas-3-0-boolean-exclusive",
  OAS_3_1_NUMERIC_EXCLUSIVE: "oas-3-1-numeric-exclusive",
} as const

export type JsonSchemaBoundRangeDialectValue =
  typeof JsonSchemaBoundRangeDialect[keyof typeof JsonSchemaBoundRangeDialect]

export type JsonSchemaBoundRangeDialectInput = JsonSchemaBoundRangeInput & {
  dialect?: JsonSchemaBoundRangeDialectValue
}

export function inferJsonSchemaBoundRangeDialect(
  input: JsonSchemaBoundRangeInput,
): JsonSchemaBoundRangeDialectValue {
  if (typeof input.exclusiveMin === "number" || typeof input.exclusiveMax === "number") {
    return JsonSchemaBoundRangeDialect.OAS_3_1_NUMERIC_EXCLUSIVE
  }
  return JsonSchemaBoundRangeDialect.OAS_3_0_BOOLEAN_EXCLUSIVE
}

export function resolveJsonSchemaBoundRangeDialect(
  input: JsonSchemaBoundRangeDialectInput,
): JsonSchemaBoundRangeDialectValue {
  return input.dialect ?? inferJsonSchemaBoundRangeDialect(input)
}
