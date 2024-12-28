import { DirectiveLocation as GraphApiDirectiveLocation } from "graphql"
import {
  GRAPH_API_NODE_KIND_BOOLEAN,
  GRAPH_API_NODE_KIND_ENUM,
  GRAPH_API_NODE_KIND_FLOAT,
  GRAPH_API_NODE_KIND_ID,
  GRAPH_API_NODE_KIND_INPUT_OBJECT,
  GRAPH_API_NODE_KIND_INTEGER,
  GRAPH_API_NODE_KIND_INTERFACE,
  GRAPH_API_NODE_KIND_LIST,
  GRAPH_API_NODE_KIND_OBJECT,
  GRAPH_API_NODE_KIND_SCALAR,
  GRAPH_API_NODE_KIND_STRING,
  GRAPH_API_NODE_KIND_UNION,
  GRAPH_API_VERSION,
} from "./constants"

export type GraphApiDirectives = Record<string, GraphApiDirective>

export interface GraphApiDefinition {
  description?: string
  directives?: GraphApiDirectives
}

export interface GraphApiNamedDefinition extends GraphApiDefinition {
  title?: string
}

export interface GraphApiNodeType<N extends string> {
  kind: N
}

export interface GraphApiRef {
  $ref?: string
}

export interface GraphApiUsage {
  nullable?: boolean
  default?: any
}

export type GraphApiAnyDefinition =
  | GraphApiScalarDefinition
  | GraphApiEnumDefinition
  | GraphApiObjectDefinition<GraphApiObjectKind>
  | GraphApiInputObjectDefinition
  | GraphApiUnionDefinition

export type GraphApiInputDefinition =
  | GraphApiScalarDefinition
  | GraphApiEnumDefinition
  | GraphApiInputObjectDefinition

export interface GraphApiAnyUsage extends GraphApiUsage {
  typeDef: GraphApiRef | GraphApiAnyDefinition
}

export interface GraphApiInputUsage extends GraphApiUsage {
  typeDef: GraphApiRef | GraphApiInputDefinition
}

// Root types

export interface GraphApiSchema {
  // GraphAPI version
  graphapi: typeof GRAPH_API_VERSION

  // schema description
  description?: string

  // root schema operations
  queries?: Record<string, GraphApiOperation>
  mutations?: Record<string, GraphApiOperation>
  subscriptions?: Record<string, GraphApiOperation>

  // schema directives
  directives?: GraphApiDirectives

  // definitions
  components?: GraphApiComponents
}

export interface GraphApiOperation extends GraphApiDefinition {
  args?: GraphApiArgs
  output: GraphApiAnyUsage
}

export interface GraphApiComponents {
  // named types
  scalars?: Record<string, GraphApiScalarDefinition>
  objects?: Record<string, GraphApiObjectDefinition<typeof GRAPH_API_NODE_KIND_OBJECT>>
  interfaces?: Record<string, GraphApiObjectDefinition<typeof GRAPH_API_NODE_KIND_INTERFACE>>
  inputObjects?: Record<string, GraphApiInputObjectDefinition>
  enums?: Record<string, GraphApiEnumDefinition>
  unions?: Record<string, GraphApiUnionDefinition>

  // directive schemas
  directives?: Record<string, GraphApiDirectiveDefinition>
}

export type GraphApiComponentsKind = keyof GraphApiComponents

// Scalar

export type GraphApiScalarType =
  | typeof GRAPH_API_NODE_KIND_ID
  | typeof GRAPH_API_NODE_KIND_STRING
  | typeof GRAPH_API_NODE_KIND_FLOAT
  | typeof GRAPH_API_NODE_KIND_INTEGER
  | typeof GRAPH_API_NODE_KIND_BOOLEAN
  | typeof GRAPH_API_NODE_KIND_SCALAR

export interface GraphApiScalarDefinition extends GraphApiNamedDefinition {
  type: GraphApiNodeType<GraphApiScalarType>
}

// Objects & Interfaces

export type GraphApiObjectKind =
  | typeof GRAPH_API_NODE_KIND_OBJECT
  | typeof GRAPH_API_NODE_KIND_INTERFACE

export interface GraphApiObjectiveNodeType<T extends GraphApiObjectKind> extends GraphApiNodeType<T> {
  methods?: Record<string, GraphApiOperation>
  interfaces?: GraphApiRef[]
}

export interface GraphApiObjectDefinition<T extends GraphApiObjectKind> extends GraphApiNamedDefinition {
  type: GraphApiObjectiveNodeType<T>
}

// Input objects

export interface GraphApiInputObjectiveNodeType extends GraphApiNodeType<typeof GRAPH_API_NODE_KIND_INPUT_OBJECT> {
  // props can't have args in difference with object
  properties?: Record<string, GraphApiArgument>
}

export interface GraphApiInputObjectDefinition extends GraphApiNamedDefinition {
  type: GraphApiInputObjectiveNodeType
}

// Enum

export interface GraphApiEnumeratedNodeType extends GraphApiNodeType<typeof GRAPH_API_NODE_KIND_ENUM> {
  values?: Record<string, GraphEnumValue>
}

export interface GraphApiEnumDefinition extends GraphApiNamedDefinition {
  type: GraphApiEnumeratedNodeType
}

export type GraphEnumValue = {
  description?: string
  directives?: GraphApiDirectives
}

// Union

export interface GraphApiCombinedEntityType extends GraphApiNodeType<typeof GRAPH_API_NODE_KIND_UNION> {
  oneOf: (GraphApiRef | GraphApiAnyDefinition)[]
}

export interface GraphApiUnionDefinition extends GraphApiNamedDefinition {
  type: GraphApiCombinedEntityType
}

// List

export interface GraphApiListedEntityType extends GraphApiNodeType<typeof GRAPH_API_NODE_KIND_LIST> {
  items?: GraphApiAnyUsage
}

export interface GraphApiListDefinition extends GraphApiNamedDefinition {
  type: GraphApiListedEntityType
}

// Arguments

export type GraphApiArgs = Record<string, GraphApiArgument>

export interface GraphApiArgument extends GraphApiInputUsage {
  // field description
  description?: string
  // field directives
  directives?: GraphApiDirectives
}

// Directives

export interface GraphApiDirectiveDefinition {
  // name
  title: string
  // description
  description?: string
  // locations
  locations: GraphApiDirectiveLocation[]
  // args[]
  args?: GraphApiArgs
  // isRepeatable
  repeatable?: boolean
}

export type GraphApiDirective = {
  // directive definition
  definition: GraphApiRef | GraphApiDirectiveDefinition
  // provided arguments values
  meta?: Record<string, any>
}
