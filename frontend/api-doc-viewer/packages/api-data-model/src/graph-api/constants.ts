
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
  directive: 'directive',
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
