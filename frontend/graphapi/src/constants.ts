import { DirectiveLocation } from "graphql"
import { GraphApiNamedDefinition } from "./types"

export const GRAPH_API_NODE_KIND_ID = 'ID'
export const GRAPH_API_NODE_KIND_STRING = 'string'
export const GRAPH_API_NODE_KIND_INTEGER = 'integer'
export const GRAPH_API_NODE_KIND_FLOAT = 'float'
export const GRAPH_API_NODE_KIND_BOOLEAN = 'boolean'
export const GRAPH_API_NODE_KIND_ENUM = 'enum'
export const GRAPH_API_NODE_KIND_OBJECT = 'object'
export const GRAPH_API_NODE_KIND_INTERFACE = 'interface'
export const GRAPH_API_NODE_KIND_SCALAR = 'scalar'
export const GRAPH_API_NODE_KIND_LIST = 'list'
export const GRAPH_API_NODE_KIND_UNION = 'union'
export const GRAPH_API_NODE_KIND_INPUT_OBJECT = 'input'

export const GRAPH_API_SCALAR_NODE_KINDS = [
  GRAPH_API_NODE_KIND_ID,
  GRAPH_API_NODE_KIND_STRING,
  GRAPH_API_NODE_KIND_INTEGER,
  GRAPH_API_NODE_KIND_FLOAT,
  GRAPH_API_NODE_KIND_BOOLEAN,
  GRAPH_API_NODE_KIND_SCALAR,
] as const

export const GRAPH_API_DIRECTIVE_LOCATIONS = [
  /** Request Definitions */
  DirectiveLocation.QUERY,
  DirectiveLocation.MUTATION,
  DirectiveLocation.SUBSCRIPTION,
  DirectiveLocation.FIELD,
  DirectiveLocation.FRAGMENT_DEFINITION,
  DirectiveLocation.FRAGMENT_SPREAD,
  DirectiveLocation.INLINE_FRAGMENT,
  DirectiveLocation.VARIABLE_DEFINITION,
  /** Type System Definitions */
  DirectiveLocation.SCHEMA,
  DirectiveLocation.SCALAR,
  DirectiveLocation.OBJECT,
  DirectiveLocation.FIELD_DEFINITION,
  DirectiveLocation.ARGUMENT_DEFINITION,
  DirectiveLocation.INTERFACE,
  DirectiveLocation.UNION,
  DirectiveLocation.ENUM,
  DirectiveLocation.ENUM_VALUE,
  DirectiveLocation.INPUT_OBJECT,
  DirectiveLocation.INPUT_FIELD_DEFINITION,
] as const

export const GRAPH_API_VERSION = '1.0.0'

export const GRAPH_API_KIND_TO_GRAPH_QL_TYPE = {
  ID: 'ID',
  string: 'String',
  integer: 'Int',
  float: 'Float',
  boolean: 'Boolean',
  scalar: (entity?: GraphApiNamedDefinition) => entity?.title,
  enum: (entity?: GraphApiNamedDefinition) => entity?.title,
  object: (entity?: GraphApiNamedDefinition) => entity?.title,
  interface: (entity?: GraphApiNamedDefinition) => entity?.title,
  input: (entity?: GraphApiNamedDefinition) => entity?.title,
  list: (entity?: GraphApiNamedDefinition) => entity?.title,
  union: (entity?: GraphApiNamedDefinition) => entity?.title,
}

export const BUILT_IN_DIRECTIVE_SPECIFIED_BY = 'specifiedBy'
export const BUILT_IN_DIRECTIVE_SKIP = 'skip'
export const BUILT_IN_DIRECTIVE_INCLUDE = 'include'
export const BUILT_IN_DIRECTIVE_DEPRECATED = 'deprecated'
export const BUILT_IN_DIRECTIVE_ONE_OF = 'oneOf'

export const BUILT_IN_DIRECTIVES = [
  BUILT_IN_DIRECTIVE_INCLUDE,
  BUILT_IN_DIRECTIVE_SKIP,
  BUILT_IN_DIRECTIVE_SPECIFIED_BY,
  BUILT_IN_DIRECTIVE_DEPRECATED,
  BUILT_IN_DIRECTIVE_ONE_OF
] as const

export const BUILT_IN_DIRECTIVES_SET = new Set<string>(BUILT_IN_DIRECTIVES)

export const GRAPH_API_DIRECTIVE_DEPRECATED_DEFAULT_REASON = 'No longer supported'
