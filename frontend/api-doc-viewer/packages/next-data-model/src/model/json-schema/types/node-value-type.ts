import { TYPE_ANY, TYPE_NOTHING, TYPE_UNKNOWN } from "@apihub/next-data-model/model/abstract/constants"

export const JsonSchemaNodeValueTypes = {
  UNKNOWN: TYPE_UNKNOWN,
  ANY: TYPE_ANY,
  NOTHING: TYPE_NOTHING,
  NULL: "null",
  STRING: "string",
  NUMBER: "number",
  INTEGER: "integer",
  BOOLEAN: "boolean",
  OBJECT: "object",
  ARRAY: "array",
} as const

export type JsonSchemaNodeValueType = typeof JsonSchemaNodeValueTypes[keyof typeof JsonSchemaNodeValueTypes]

export const JsonSchemaNodeValueTypesList: JsonSchemaNodeValueType[] = Object.values(JsonSchemaNodeValueTypes)
