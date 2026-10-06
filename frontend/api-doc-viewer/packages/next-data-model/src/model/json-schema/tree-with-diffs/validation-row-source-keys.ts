import { JsonSchemaValidationKeys } from "@apihub/next-data-model/model/json-schema/types/validation-key"
import { NodeDiffsSeverityPlacemennt } from "@apihub/next-data-model/model/abstract/tree-with-diffs/tree-node.interface"

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

export const JSON_SCHEMA_VALIDATION_ROW_SOURCE_KEYS: Record<JsonSchemaValidationRowKey, readonly string[]> = {
  [JsonSchemaValidationRowKeys.VALUE_LENGTH]: ["minLength", "maxLength"],
  [JsonSchemaValidationRowKeys.VALUE_PATTERN]: ["pattern"],
  [JsonSchemaValidationRowKeys.VALUE_RANGE]: [
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
  ],
  [JsonSchemaValidationRowKeys.VALUE_MULTIPLE_OF]: ["multipleOf"],
  [JsonSchemaValidationRowKeys.PROPERTIES_COUNT]: ["minProperties", "maxProperties"],
  [JsonSchemaValidationRowKeys.ITEMS_COUNT]: ["minItems", "maxItems"],
  [JsonSchemaValidationRowKeys.UNIQUE_ITEMS]: ["uniqueItems"],
}

/** Per-row floating-badge placement - each validation row needs its own severity slot so a
 * change in one constraint (e.g. `minLength`) does not paint the badge on unrelated rows. */
export const JSON_SCHEMA_VALIDATION_ROW_SEVERITY_PLACEMENTS: Record<JsonSchemaValidationRowKey, NodeDiffsSeverityPlacemennt> = {
  [JsonSchemaValidationRowKeys.VALUE_LENGTH]: NodeDiffsSeverityPlacemennt.ValueLengthRow,
  [JsonSchemaValidationRowKeys.VALUE_PATTERN]: NodeDiffsSeverityPlacemennt.ValuePatternRow,
  [JsonSchemaValidationRowKeys.VALUE_RANGE]: NodeDiffsSeverityPlacemennt.ValueRangeRow,
  [JsonSchemaValidationRowKeys.VALUE_MULTIPLE_OF]: NodeDiffsSeverityPlacemennt.ValueMultipleOfRow,
  [JsonSchemaValidationRowKeys.PROPERTIES_COUNT]: NodeDiffsSeverityPlacemennt.PropertiesCountRow,
  [JsonSchemaValidationRowKeys.ITEMS_COUNT]: NodeDiffsSeverityPlacemennt.ItemsCountRow,
  [JsonSchemaValidationRowKeys.UNIQUE_ITEMS]: NodeDiffsSeverityPlacemennt.UniqueItemsRow,
}

/** Logical lower/upper slot per source key (not display index when only one bound is present). */
export const JSON_SCHEMA_VALIDATION_SOURCE_KEY_CHIP_INDEX: Record<
  JsonSchemaValidationRowKey,
  Partial<Record<string, number>>
> = {
  [JsonSchemaValidationRowKeys.VALUE_LENGTH]: { minLength: 0, maxLength: 1 },
  [JsonSchemaValidationRowKeys.VALUE_PATTERN]: { pattern: 0 },
  [JsonSchemaValidationRowKeys.VALUE_RANGE]: {
    minimum: 0,
    exclusiveMinimum: 0,
    maximum: 1,
    exclusiveMaximum: 1,
  },
  [JsonSchemaValidationRowKeys.VALUE_MULTIPLE_OF]: { multipleOf: 0 },
  [JsonSchemaValidationRowKeys.PROPERTIES_COUNT]: { minProperties: 0, maxProperties: 1 },
  [JsonSchemaValidationRowKeys.ITEMS_COUNT]: { minItems: 0, maxItems: 1 },
  [JsonSchemaValidationRowKeys.UNIQUE_ITEMS]: { uniqueItems: 0 },
}
