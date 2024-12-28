import { DirectiveLocation, GraphQLList, GraphQLNamedType, GraphQLNonNull, GraphQLNullableType, GraphQLScalarType } from 'graphql'
import { GRAPH_API_DIRECTIVE_LOCATIONS, GRAPH_API_NODE_KIND_INTERFACE, GRAPH_API_NODE_KIND_OBJECT, GRAPH_API_VERSION } from './constants'
import { GraphApiAnyDefinition, GraphApiAnyUsage, GraphApiArgs, GraphApiArgument, GraphApiDirective, GraphApiDirectiveDefinition, GraphApiDirectives, GraphApiEnumDefinition, GraphApiInputObjectDefinition, GraphApiListDefinition, GraphApiNodeType, GraphApiObjectDefinition, GraphApiObjectKind, GraphApiOperation, GraphApiRef, GraphApiScalarDefinition, GraphApiSchema, GraphApiUnionDefinition } from './types'

export function isObject(maybeObject: unknown): maybeObject is Record<PropertyKey, unknown> {
  return !!maybeObject && typeof maybeObject === 'object'
}

export function isGraphApi(value: unknown): value is GraphApiSchema {
  if (!isObject(value)) {
    return false
  }
  return 'graphapi' in value && value.graphapi === GRAPH_API_VERSION &&
    (
      'queries' in value &&
      isObject(value.queries) &&
      Object.values(value.queries).every(isGraphApiOperation) ||
      'mutations' in value &&
      isObject(value.mutations) &&
      Object.values(value.mutations).every(isGraphApiOperation) ||
      'subscriptions' in value &&
      isObject(value.subscriptions) &&
      Object.values(value.subscriptions).every(isGraphApiOperation)
    )
}

export function isGraphApiOperation(value: unknown): value is GraphApiOperation {
  if (!isObject(value)) {
    return false
  }
  return 'output' in value && isObject(value.output)
}

export function isGraphApiArgument(value: unknown): value is GraphApiArgument {
  if (!isObject(value)) {
    return false
  }
  return 'typeDef' in value && isObject(value.typeDef)
}

export function isGraphApiArgs(value: unknown): value is GraphApiArgs {
  if (!isObject(value)) {
    return false
  }
  return Object.values(value).every(isGraphApiArgument)
}

export function isGraphApiRef(value: unknown): value is GraphApiRef {
  if (!isObject(value)) {
    return false
  }
  return '$ref' in value && typeof value.$ref === 'string'
}

export function hasGraphApiEntityType(value: unknown): value is { type: GraphApiNodeType<string> } {
  if (!isObject(value)) {
    return false
  }
  return (
    'type' in value && isObject(value.type) &&
    'kind' in value.type && typeof value.type.kind === 'string'
  )
}

export function isGraphApiDirective(value: unknown): value is GraphApiDirective {
  if (!isObject(value)) {
    return false
  }
  return 'definition' in value && isGraphApiDirectiveDefinition(value.definition)
}

export function isGraphApiDirectiveDefinition(value: unknown): value is GraphApiDirectiveDefinition {
  if (!isObject(value)) {
    return false
  }
  return (
    'locations' in value && Array.isArray(value.locations) &&
    value.locations.length > 0 && value.locations.every(isGraphApiDirectiveLocation)
  )
}

export function isGraphApiDirectiveLocation(value: unknown): value is DirectiveLocation {
  if (typeof value !== 'string') {
    return false
  }
  return GRAPH_API_DIRECTIVE_LOCATIONS.some(loc => value === loc)
}

export function isGraphApiDirectives(value: unknown): value is GraphApiDirectives {
  if (!isObject(value)) {
    return false
  }
  return Object.values(value).every(isGraphApiDirective)
}

export function isGraphApiUnionDefinition(value: unknown): value is GraphApiUnionDefinition {
  if (!isObject(value)) {
    return false
  }
  if (!hasGraphApiEntityType(value)) {
    return false
  }
  return value.type.kind === 'union'
}

export function isGraphApiListDefinition(value: unknown): value is GraphApiListDefinition {
  if (!isObject(value)) {
    return false
  }
  if (!hasGraphApiEntityType(value)) {
    return false
  }
  return value.type.kind === 'list'
}

export function isGraphApiScalarDefinition(value: unknown): value is GraphApiScalarDefinition {
  if (!isObject(value)) {
    return false
  }
  if (!hasGraphApiEntityType(value)) {
    return false
  }
  return value.type.kind === 'scalar' ||
    ['ID', 'string', 'integer', 'float', 'boolean', 'scalar']
      .some(kind => kind === value.type.kind)
}

export function isGraphApiEnumDefinition(value: unknown): value is GraphApiEnumDefinition {
  if (!isObject(value)) {
    return false
  }
  if (!hasGraphApiEntityType(value)) {
    return false
  }
  return value.type.kind === 'enum'
}

export function isGraphApiObjectDefinition(value: unknown): value is GraphApiObjectDefinition<typeof GRAPH_API_NODE_KIND_OBJECT> {
  if (!isObject(value)) {
    return false
  }
  if (!hasGraphApiEntityType(value)) {
    return false
  }
  return value.type.kind === GRAPH_API_NODE_KIND_OBJECT
}

export function isGraphApiInterfaceDefinition(value: unknown): value is GraphApiObjectDefinition<typeof GRAPH_API_NODE_KIND_INTERFACE> {
  if (!isObject(value)) {
    return false
  }
  if (!hasGraphApiEntityType(value)) {
    return false
  }
  return value.type.kind === GRAPH_API_NODE_KIND_INTERFACE
}

export function isGraphApiObjectiveDefinition(value: unknown): value is GraphApiObjectDefinition<GraphApiObjectKind> {
  return isGraphApiObjectDefinition(value) || isGraphApiInterfaceDefinition(value)
}

export function isGraphApiInputObjectDefinition(value: unknown): value is GraphApiInputObjectDefinition {
  if (!isObject(value)) {
    return false
  }
  if (!hasGraphApiEntityType(value)) {
    return false
  }
  return value.type.kind === 'input'
}

export function isGraphApiAnyDefinition(value: unknown): value is GraphApiAnyDefinition {
  return (
    isGraphApiScalarDefinition(value) ||
    isGraphApiEnumDefinition(value) ||
    isGraphApiObjectDefinition(value) ||
    isGraphApiInterfaceDefinition(value) ||
    isGraphApiInputObjectDefinition(value) ||
    isGraphApiUnionDefinition(value)
  )
}

export function isGraphApiAnyUsage(value: unknown): value is GraphApiAnyUsage {
  if (!isObject(value) || !('typeDef' in value)) {
    return false
  }
  return isGraphApiAnyDefinition(value.typeDef)
}

// guards for types from "graphql"

// way to avoid graphql dependency
const isGraphQLType = (gqlType: GraphQLNullableType, typeName: string): boolean => {
  const printName = Object.prototype.toString.call(gqlType)
  return printName === `[object ${typeName}]`
}

export function isNonNullType(gqlType: GraphQLNullableType): gqlType is GraphQLNonNull<any> {
  // return gqlType instanceof GraphQLNonNull
  return isGraphQLType(gqlType, 'GraphQLNonNull')
}

export function isListType(gqlType: GraphQLNullableType): gqlType is GraphQLList<any> {
  // return gqlType instanceof GraphQLList
  return isGraphQLType(gqlType, 'GraphQLList')
}

export function isScalarType(gqlType: GraphQLNamedType): gqlType is GraphQLScalarType {
  // return gqlType instanceOf GraphQLScalarType
  return isGraphQLType(gqlType, 'GraphQLScalarType')
}
