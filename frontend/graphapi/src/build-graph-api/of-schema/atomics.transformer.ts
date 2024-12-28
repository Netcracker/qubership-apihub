import { GraphQLEnumValue, GraphQLField, GraphQLInputField, GraphQLNamedType, GraphQLSchema } from "graphql"
import { GraphApiDefinition, GraphApiNamedDefinition } from "../../types"
import { transformUsedDirectives } from "./definition-parts.transformer"

export function transformBaseType(
  baseType:
    GraphQLSchema
    | GraphQLNamedType
    | GraphQLEnumValue
    | GraphQLField<any, any>
    | GraphQLInputField
): GraphApiDefinition {
  return {
    ...baseType.description ? { description: baseType.description } : {},
    ...transformUsedDirectives(baseType.astNode),
  }
}

export function transformNamedType(
  baseType:
    GraphQLNamedType
    | GraphQLEnumValue
    | GraphQLField<any, any>
    | GraphQLInputField
): GraphApiNamedDefinition {
  return {
    title: baseType.name,
    ...transformBaseType(baseType)
  }
}
