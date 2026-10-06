import { JsonSchemaTreeNodeKinds } from "@apihub/next-data-model/model/json-schema/types/node-kind"

export const jsonSchemaNodeKind = {
  root: JsonSchemaTreeNodeKinds.ROOT,
  definition: JsonSchemaTreeNodeKinds.DEFINITION,
  property: JsonSchemaTreeNodeKinds.PROPERTY,
  additionalProperties: JsonSchemaTreeNodeKinds.ADDITIONAL_PROPERTIES,
  patternProperty: JsonSchemaTreeNodeKinds.PATTERN_PROPERTY,
  items: JsonSchemaTreeNodeKinds.ITEMS,
  item: JsonSchemaTreeNodeKinds.ITEM,
  additionalItems: JsonSchemaTreeNodeKinds.ADDITIONAL_ITEMS,
  allOf: JsonSchemaTreeNodeKinds.ALL_OF,
  anyOf: JsonSchemaTreeNodeKinds.ANY_OF,
  oneOf: JsonSchemaTreeNodeKinds.ONE_OF,
} as const
