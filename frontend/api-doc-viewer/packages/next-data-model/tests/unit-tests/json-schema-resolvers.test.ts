import { resolveBoundRangeLabel } from "../../src/model/json-schema/bound-range"
import {
  inferJsonSchemaBoundRangeDialect,
  JsonSchemaBoundRangeDialect,
} from "../../src/model/json-schema/json-schema-bound-range-dialect"
import { resolveJsonSchemaTypeLabel } from "../../src/model/json-schema/type-label"
import { JsonSchemaValidationKeys } from "../../src/model/json-schema/types/validation-key"
import { resolveValidationKeysForType } from "../../src/model/json-schema/validation-keys"
import { resolveValueRangeLabel } from "../../src/model/json-schema/value-range"

describe("JSON Schema model resolvers", () => {
  it("returns an empty label for boolean primitive node values", () => {
    expect(resolveJsonSchemaTypeLabel(false, null)).toBe("")
    expect(resolveJsonSchemaTypeLabel(true, null)).toBe("")
  })

  it("resolves type label with format and nullable suffix", () => {
    expect(resolveJsonSchemaTypeLabel({ type: "string", format: "uuid", nullable: true }, null))
      .toBe("string(uuid) or null")
  })

  it("resolves type label with title", () => {
    expect(resolveJsonSchemaTypeLabel({ type: "object", title: "Sample Object" }, null))
      .toBe("object<Sample Object>")
  })

  it("resolves type label with format, title, and nullable suffix", () => {
    expect(resolveJsonSchemaTypeLabel(
      { type: "string", format: "date-time", title: "MyTitle", nullable: true },
      null,
    )).toBe("string(date-time)<MyTitle> or null")
  })

  it("resolves validation keys for string constraints", () => {
    expect(resolveValidationKeysForType({
      type: "string",
      minLength: 1,
      pattern: "^x",
    })).toEqual([JsonSchemaValidationKeys.MIN_LENGTH, JsonSchemaValidationKeys.PATTERN])
  })

  it("resolves numeric value range labels", () => {
    const result = resolveValueRangeLabel({
      type: "number",
      minimum: 0,
      maximum: 10,
    })
    expect(result.visible).toBe(true)
    expect(result.data.lower).toBe(">= 0")
    expect(result.data.upper).toBe("<= 10")
  })

  it("resolves numeric value range with exclusive bounds", () => {
    const result = resolveValueRangeLabel({
      type: "integer",
      exclusiveMinimum: 5,
      exclusiveMaximum: 10,
    })
    expect(result.visible).toBe(true)
    expect(result.data.lower).toBe("> 5")
    expect(result.data.upper).toBe("< 10")
  })

  it("resolves bound range labels for length and count constraints", () => {
    expect(resolveBoundRangeLabel({ min: 1, max: 10 })).toEqual({
      visible: true,
      data: { lower: ">= 1", upper: "<= 10" },
    })
    expect(resolveBoundRangeLabel({ max: 3 })).toEqual({
      visible: true,
      data: { upper: "<= 3" },
    })
  })

  it("resolves bound range with boolean exclusive flags (draft-04 style)", () => {
    expect(resolveBoundRangeLabel({
      min: 0,
      exclusiveMin: true,
      max: 10,
      exclusiveMax: true,
    })).toEqual({
      visible: true,
      data: { lower: "> 0", upper: "< 10" },
    })
  })

  it("prefers stricter numeric exclusive bound when both min and exclusiveMin are set", () => {
    expect(resolveBoundRangeLabel({
      min: 5,
      exclusiveMin: 5,
    })).toEqual({
      visible: true,
      data: { lower: "> 5" },
    })
  })

  it("infers OAS 3.1 dialect from numeric exclusive bounds", () => {
    expect(inferJsonSchemaBoundRangeDialect({ exclusiveMin: 2 })).toBe(
      JsonSchemaBoundRangeDialect.OAS_3_1_NUMERIC_EXCLUSIVE,
    )
    expect(inferJsonSchemaBoundRangeDialect({ min: 1, exclusiveMin: true })).toBe(
      JsonSchemaBoundRangeDialect.OAS_3_0_BOOLEAN_EXCLUSIVE,
    )
  })

  it("does not render standalone boolean exclusive bounds without a paired minimum/maximum", () => {
    expect(resolveBoundRangeLabel({ exclusiveMin: true })).toEqual({
      visible: false,
      data: {},
    })
    expect(resolveBoundRangeLabel({ exclusiveMax: true })).toEqual({
      visible: false,
      data: {},
    })
  })
})
