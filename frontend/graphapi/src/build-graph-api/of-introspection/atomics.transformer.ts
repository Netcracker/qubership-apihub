import type { IntrospectionType, IntrospectionEnumValue, IntrospectionField, IntrospectionInputValue } from "graphql";
import type { GraphApiDefinition, GraphApiNamedDefinition } from "../../types";
import { GRAPH_API_DIRECTIVE_DEPRECATED_DEFAULT_REASON } from "../../constants";


// FIXME 13.11.24 // Directives?
export function transformBaseType(
  baseType:
    IntrospectionType |
    IntrospectionEnumValue |
    IntrospectionField |
    IntrospectionInputValue): GraphApiDefinition {
  const isDeprecated = "isDeprecated" in baseType ? baseType.isDeprecated : false
  const reason = "deprecationReason" in baseType ? baseType.deprecationReason : ''
  return {
    ...baseType.description ? { description: baseType.description } : {},
    ...isDeprecated ? {
      deprecated: reason && reason !== GRAPH_API_DIRECTIVE_DEPRECATED_DEFAULT_REASON ? { reason } : true
    } : {}
  }
}
export function transformNamedType(
  baseType:
    IntrospectionType |
    IntrospectionField |
    IntrospectionInputValue): GraphApiNamedDefinition {
  return {
    title: baseType.name,
    ...transformBaseType(baseType)
  }
}
