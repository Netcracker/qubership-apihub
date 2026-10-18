import { JsonSchemaTreeNodeValue } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/node-value"
import { resolveBoundRangeLabel } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/bound-range"
import { resolveValueRangeLabel } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/value-range"
import {
  JsonSchemaValidationFieldsView,
  resolveJsonSchemaValidationFieldsView,
} from "@netcracker/qubership-apihub-next-data-model/model/json-schema/validation-keys"
import { JsonSchemaValidationKeys } from "@netcracker/qubership-apihub-next-data-model/model/json-schema/types/validation-key"
import {
  ITEMS_COUNT_LABEL,
  PROPERTIES_COUNT_LABEL,
  UNIQUE_ITEMS_LABEL,
  VALUE_LENGTH_LABEL,
  VALUE_MULTIPLE_OF_LABEL,
  VALUE_PATTERN_LABEL,
  VALUE_RANGE_LABEL,
} from "../../../consts/validations"

export const JsonSchemaValidationRowKeys = {
  VALUE_LENGTH: "valueLength",
  VALUE_PATTERN: "valuePattern",
  VALUE_RANGE: "valueRange",
  VALUE_MULTIPLE_OF: "valueMultipleOf",
  PROPERTIES_COUNT: "propertiesCount",
  ITEMS_COUNT: "itemsCount",
  UNIQUE_ITEMS: JsonSchemaValidationKeys.UNIQUE_ITEMS,
} as const

export type JsonSchemaValidationRowKey = typeof JsonSchemaValidationRowKeys[keyof typeof JsonSchemaValidationRowKeys]

export type JsonSchemaValidationRow = {
  key: JsonSchemaValidationRowKey
  label: string
  values: string[]
}

/**
 * Canonical row order, grouped by the schema type each row belongs to - mirrors legacy's
 * `Validations.tsx` section order (String -> Number -> Object -> Array; `valueRange`/
 * `valueMultipleOf` apply to both `number` and `integer`, matching legacy's `isNumberValue`).
 * Rows are sorted by this order rather than relying on push order, because a row whose value
 * only exists via a diff (the type it belonged to was removed, or not yet added) would otherwise
 * land wherever it happened to be appended - reversing group order between e.g. `string-to-number`
 * and `number-to-string` instead of keeping it type-group-stable.
 */
const VALIDATION_ROW_ORDER: readonly JsonSchemaValidationRowKey[] = [
  JsonSchemaValidationRowKeys.VALUE_LENGTH,
  JsonSchemaValidationRowKeys.VALUE_PATTERN,
  JsonSchemaValidationRowKeys.VALUE_RANGE,
  JsonSchemaValidationRowKeys.VALUE_MULTIPLE_OF,
  JsonSchemaValidationRowKeys.PROPERTIES_COUNT,
  JsonSchemaValidationRowKeys.UNIQUE_ITEMS,
  JsonSchemaValidationRowKeys.ITEMS_COUNT,
]

export class JsonSchemaValidationRows {
  private static formatBoundRangeChips(
    min: number | undefined,
    max: number | undefined,
    exclusiveMin?: number | boolean,
    exclusiveMax?: number | boolean,
  ): string[] {
    const range = resolveBoundRangeLabel({ min, max, exclusiveMin, exclusiveMax })
    if (!range.visible) {
      return []
    }
    return [range.data.lower, range.data.upper].filter((chip): chip is string => Boolean(chip))
  }

  private static formatValueRangeChips(fields: JsonSchemaValidationFieldsView): string[] {
    const range = resolveValueRangeLabel(fields)
    if (!range.visible) {
      return []
    }
    return [range.data.lower, range.data.upper].filter((chip): chip is string => Boolean(chip))
  }

  private static formatScalar(value: unknown): string {
    if (typeof value === "string") {
      return value
    }
    return JSON.stringify(value)
  }

  public static resolve(value: JsonSchemaTreeNodeValue | null | undefined): JsonSchemaValidationRow[] {
    if (!value) {
      return []
    }

    const rows: JsonSchemaValidationRow[] = []
    const fields = resolveJsonSchemaValidationFieldsView(value)

    const valueLength = this.formatBoundRangeChips(fields.minLength, fields.maxLength)
    if (valueLength.length) {
      rows.push({ key: JsonSchemaValidationRowKeys.VALUE_LENGTH, label: VALUE_LENGTH_LABEL, values: valueLength })
    }

    if (fields.pattern !== undefined) {
      rows.push({
        key: JsonSchemaValidationRowKeys.VALUE_PATTERN,
        label: VALUE_PATTERN_LABEL,
        values: [String(fields.pattern)],
      })
    }

    const valueRange = this.formatValueRangeChips(fields)
    if (valueRange.length) {
      rows.push({ key: JsonSchemaValidationRowKeys.VALUE_RANGE, label: VALUE_RANGE_LABEL, values: valueRange })
    }

    if (fields.multipleOf !== undefined) {
      rows.push({
        key: JsonSchemaValidationRowKeys.VALUE_MULTIPLE_OF,
        label: VALUE_MULTIPLE_OF_LABEL,
        values: [String(fields.multipleOf)],
      })
    }

    const propertiesCount = this.formatBoundRangeChips(fields.minProperties, fields.maxProperties)
    if (propertiesCount.length) {
      rows.push({
        key: JsonSchemaValidationRowKeys.PROPERTIES_COUNT,
        label: PROPERTIES_COUNT_LABEL,
        values: propertiesCount,
      })
    }

    if (fields.uniqueItems !== undefined) {
      rows.push({
        key: JsonSchemaValidationRowKeys.UNIQUE_ITEMS,
        label: UNIQUE_ITEMS_LABEL,
        values: [String(fields.uniqueItems)],
      })
    }

    const itemsCount = this.formatBoundRangeChips(fields.minItems, fields.maxItems)
    if (itemsCount.length) {
      rows.push({ key: JsonSchemaValidationRowKeys.ITEMS_COUNT, label: ITEMS_COUNT_LABEL, values: itemsCount })
    }

    return rows
  }

  public static resolveListValues(values: unknown[]): string[] {
    return values.map(this.formatScalar)
  }

  public static sortByType(rows: JsonSchemaValidationRow[]): JsonSchemaValidationRow[] {
    return [...rows].sort(
      (a, b) => VALIDATION_ROW_ORDER.indexOf(a.key as JsonSchemaValidationRowKey)
        - VALIDATION_ROW_ORDER.indexOf(b.key as JsonSchemaValidationRowKey),
    )
  }
}
