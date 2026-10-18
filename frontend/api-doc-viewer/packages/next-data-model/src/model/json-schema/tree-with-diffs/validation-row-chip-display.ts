import { resolveBoundRangeLabel } from "@apihub/next-data-model/model/json-schema/bound-range"
import {
  JsonSchemaValidationRowKey,
  JsonSchemaValidationRowKeys,
} from "@apihub/next-data-model/model/json-schema/tree-with-diffs/validation-row-source-keys"

export function formatJsonSchemaValueRangeBoundChip(
  boundKey: "minimum" | "maximum",
  boundValue: number,
  exclusiveFlag: number | boolean | undefined,
): string | undefined {
  if (boundKey === "minimum") {
    return resolveBoundRangeLabel({ min: boundValue, exclusiveMin: exclusiveFlag }).data.lower
  }
  return resolveBoundRangeLabel({ max: boundValue, exclusiveMax: exclusiveFlag }).data.upper
}

function formatScalar(value: unknown): string {
  if (typeof value === "string") {
    return value
  }
  return JSON.stringify(value)
}

export function formatJsonSchemaValidationRowChipDisplay(
  rowKey: JsonSchemaValidationRowKey,
  sourceKey: string,
  rawValue: unknown,
): string {
  switch (rowKey) {
    case JsonSchemaValidationRowKeys.VALUE_LENGTH:
    case JsonSchemaValidationRowKeys.PROPERTIES_COUNT:
    case JsonSchemaValidationRowKeys.ITEMS_COUNT: {
      if (sourceKey.startsWith("min")) {
        const label = resolveBoundRangeLabel({ min: Number(rawValue) })
        return label.data.lower ?? formatScalar(rawValue)
      }
      if (sourceKey.startsWith("max")) {
        const label = resolveBoundRangeLabel({ max: Number(rawValue) })
        return label.data.upper ?? formatScalar(rawValue)
      }
      break
    }
    case JsonSchemaValidationRowKeys.VALUE_RANGE: {
      if (sourceKey === "minimum") {
        const label = resolveBoundRangeLabel({ min: Number(rawValue) })
        return label.data.lower ?? formatScalar(rawValue)
      }
      if (sourceKey === "maximum") {
        const label = resolveBoundRangeLabel({ max: Number(rawValue) })
        return label.data.upper ?? formatScalar(rawValue)
      }
      if (sourceKey === "exclusiveMinimum") {
        const exclusiveMin = typeof rawValue === "number" ? rawValue : true
        const label = resolveBoundRangeLabel({ exclusiveMin })
        return label.data.lower ?? formatScalar(rawValue)
      }
      if (sourceKey === "exclusiveMaximum") {
        const exclusiveMax = typeof rawValue === "number" ? rawValue : true
        const label = resolveBoundRangeLabel({ exclusiveMax })
        return label.data.upper ?? formatScalar(rawValue)
      }
      break
    }
    case JsonSchemaValidationRowKeys.VALUE_PATTERN:
    case JsonSchemaValidationRowKeys.VALUE_MULTIPLE_OF:
    case JsonSchemaValidationRowKeys.UNIQUE_ITEMS:
      return formatScalar(rawValue)
    default:
      return formatScalar(rawValue)
  }

  return formatScalar(rawValue)
}

function isValidationRowLowerBoundSourceKey(sourceKey: string): boolean {
  return sourceKey.startsWith("min") || sourceKey === "exclusiveMinimum"
}

function isValidationRowUpperBoundSourceKey(sourceKey: string): boolean {
  return sourceKey.startsWith("max") || sourceKey === "exclusiveMaximum"
}

/** Maps a crawl source key to its index in the rendered chip list (not a fixed lower/upper slot). */
export function resolveValidationSourceKeyDisplayIndex(
  sourceKey: string,
  mergedDisplayValues: readonly unknown[],
): number {
  if (mergedDisplayValues.length <= 1) {
    return 0
  }
  if (isValidationRowLowerBoundSourceKey(sourceKey)) {
    return 0
  }
  if (isValidationRowUpperBoundSourceKey(sourceKey)) {
    return 1
  }
  return 0
}
