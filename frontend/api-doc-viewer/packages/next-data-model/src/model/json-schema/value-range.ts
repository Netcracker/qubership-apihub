import { JsonSchemaTreeNodeValueTypeNumber } from "@apihub/next-data-model/model/json-schema/types/node-value"
import {
  JsonSchemaBoundRangeLabel,
  JsonSchemaBoundRangeResult,
  resolveBoundRangeLabel,
} from "@apihub/next-data-model/model/json-schema/bound-range"

export type JsonSchemaValueRangeLabel = JsonSchemaBoundRangeLabel

export type JsonSchemaValueRangeResult = JsonSchemaBoundRangeResult

export type JsonSchemaValueRangeBoundsInput = Pick<
  JsonSchemaTreeNodeValueTypeNumber,
  "minimum" | "maximum" | "exclusiveMinimum" | "exclusiveMaximum"
>

export function resolveValueRangeLabel(value: JsonSchemaValueRangeBoundsInput | null | undefined): JsonSchemaValueRangeResult {
  if (!value) {
    return {
      data: {},
      visible: false,
    }
  }

  return resolveBoundRangeLabel({
    min: value.minimum,
    max: value.maximum,
    exclusiveMin: value.exclusiveMinimum,
    exclusiveMax: value.exclusiveMaximum,
  })
}
