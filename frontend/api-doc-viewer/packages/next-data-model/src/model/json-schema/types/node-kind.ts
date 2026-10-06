export const JsonSchemaTreeNodeKinds = {
  ROOT: "root",
  DEFINITION: "definition",
  PROPERTY: "property",
  ADDITIONAL_PROPERTIES: "additionalProperties",
  PATTERN_PROPERTY: "patternProperty",
  ITEMS: "items",
  ITEM: "item",
  ADDITIONAL_ITEMS: "additionalItems",
  ALL_OF: "allOf",
  ANY_OF: "anyOf",
  ONE_OF: "oneOf",
} as const

export const JsonSchemaTreeNodeKindsList: JsonSchemaTreeNodeKind[] = Object.values(JsonSchemaTreeNodeKinds)

export type JsonSchemaTreeNodeKind = typeof JsonSchemaTreeNodeKinds[keyof typeof JsonSchemaTreeNodeKinds]
