import { UNKNOWN_TYPE } from "../abstract/constants"
import type { ISchemaBaseType, SchemaNodeMeta, SchemaNodeType } from "./tree/schema-types"

export const graphApiNodeKinds = ['schema', 'query', 'mutation', 'subscription']

export const graphqlEmbeddedDirectives = ['skip', 'include']

export const graphApiNodeKind = {
  schema: 'schema',
  query: 'query',
  mutation: 'mutation',
  subscription: 'subscription',
} as const

export const graphSchemaNodeKind = {
  root: 'root',
  args: 'args',
  arg: 'arg',
  output: 'output',
  usedDirectives: 'usedDirectives',
  directiveUsage: 'directiveUsage',
  definition: 'definition',
  property: 'property',
  method: 'method',
  items: 'items',
  allOf: 'allOf',
  oneOf: 'oneOf',
} as const

export const graphSchemaNodeMetaProps = [
  'directives', 'args', 'deprecationReason', 'locations', 'repeatable'
] as const

export const graphSchemaNodeValueProps = [
  'type', 'description', 'title', 'default', 'nullable'
] as const

// The base schema-vocabulary layer `SchemaModelTree`/`SchemaModelDiffTree` are built on (see
// ./tree/schema-model.ts, ./diff-tree/schema-model.ts) - generic keyword-based schema-value
// reading, not GraphQL-specific, but only consumed by graph-api now.

export const schemaNodeKind = {
  root: 'root',
  definition: 'definition',
  property: 'property',
  additionalProperties: 'additionalProperties',
  patternProperty: 'patternProperty',
  items: 'items',
  item: 'item',
  additionalItems: 'additionalItems',
  allOf: 'allOf',
  anyOf: 'anyOf',
  oneOf: 'oneOf',
} as const

export const schemaNodeTypes = [
  UNKNOWN_TYPE, 'any', 'nothing', 'string', 'number', 'integer', 'boolean', 'null', 'array', 'object'
] as const

export const schemaNodeMetaProps: (keyof SchemaNodeMeta)[] = [
  'deprecated', 'readOnly', 'writeOnly', 'externalDocs'
]

const schemaCommonProps: (keyof ISchemaBaseType)[] = [
  'type', 'description', 'title', 'enum', 'default', 'examples', 'nullable', 'extensions'
]

export const schemaNodeValueProps: Record<SchemaNodeType, readonly string[]> = {
  [UNKNOWN_TYPE]: [...schemaCommonProps],
  any: [...schemaCommonProps],
  nothing: [...schemaCommonProps],
  boolean: [...schemaCommonProps],
  null: [...schemaCommonProps],
  string: [...schemaCommonProps, 'format', 'minLength', 'maxLength', 'pattern', 'location' /* 'location' is for AsyncAPI Channel Parameters only */],
  number: [...schemaCommonProps, 'format', 'multipleOf', 'minimum', 'exclusiveMinimum', 'maximum', 'exclusiveMaximum'],
  integer: [...schemaCommonProps, 'format', 'multipleOf', 'minimum', 'exclusiveMinimum', 'maximum', 'exclusiveMaximum'],
  object: [...schemaCommonProps, 'required', 'minProperties', 'maxProperties', 'propertyNames'],
  array: [...schemaCommonProps, 'minItems', 'maxItems', 'uniqueItems'],
}
