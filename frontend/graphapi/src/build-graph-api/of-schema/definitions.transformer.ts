import { GraphQLDirective, GraphQLEnumType, GraphQLInputObjectType, GraphQLInterfaceType, GraphQLObjectType, GraphQLScalarType, GraphQLUnionType, Kind } from 'graphql';
import { BUILT_IN_DIRECTIVES_SET, GRAPH_API_NODE_KIND_ENUM, GRAPH_API_NODE_KIND_INPUT_OBJECT, GRAPH_API_NODE_KIND_INTERFACE, GRAPH_API_NODE_KIND_OBJECT, GRAPH_API_NODE_KIND_UNION } from '../../constants';
import { getScalarType } from "../utils";
import { GraphApiAnyDefinition, GraphApiAnyUsage, GraphApiArgument, GraphApiDirectiveDefinition, GraphApiEnumDefinition, GraphApiInputObjectDefinition, GraphApiInputUsage, GraphApiObjectDefinition, GraphApiObjectKind, GraphApiOperation, GraphApiScalarDefinition, GraphApiUnionDefinition, GraphEnumValue } from '../../types';
import { transformBaseType, transformNamedType } from './atomics.transformer';
import { USED_BUILT_IN_DIRECTIVES } from './declarations';
import { transformArgs, transformType2Definition, transformType2Usage, transformUsedDirectives } from './definition-parts.transformer';
import { createRef } from './utils';

export function transformDirectiveType2Definition(directive: GraphQLDirective): GraphApiDirectiveDefinition {
  return {
    title: directive.name,
    ...directive.description ? { description: directive.description } : {},
    locations: [...directive.locations],
    ...directive.args.length ? { args: transformArgs(directive.args) } : {},
    ...directive.isRepeatable ? { repeatable: true } : {},
  }
}

export function directiveType2DefinitionReducer(
  result: Record<string, GraphApiDirectiveDefinition>,
  directive: GraphQLDirective
) {
  const isOverridenBuiltInDirective = directive.astNode !== undefined
  if (!BUILT_IN_DIRECTIVES_SET.has(directive.name) || isOverridenBuiltInDirective || USED_BUILT_IN_DIRECTIVES.has(directive.name)) {
    result[directive.name] = transformDirectiveType2Definition(directive)
  }
  return result
}

export function transformDirectiveTypes2Definitions(directives: ReadonlyArray<GraphQLDirective>) {
  const directiveDefinitions = directives.reduce(directiveType2DefinitionReducer, {})
  return Object.keys(directiveDefinitions).length ? { directives: directiveDefinitions } : {}
}

export function transformScalarType2Definition(scalarType: GraphQLScalarType): GraphApiScalarDefinition {
  return {
    ...transformNamedType(scalarType),
    type: getScalarType(scalarType),
  }
}

export function isGraphQLInterfaceType(
  objectType: GraphQLObjectType | GraphQLInterfaceType
): objectType is GraphQLInterfaceType {
  return objectType.astNode?.kind === Kind.INTERFACE_TYPE_DEFINITION
}

export function transformObjectType2Definition(
  objectType: GraphQLObjectType | GraphQLInterfaceType
): GraphApiObjectDefinition<GraphApiObjectKind> {
  const methods: Record<string, GraphApiOperation> = {}
  const fields = objectType.getFields()
  const interfaces = objectType
    .getInterfaces()
    .map((item) => ({
      $ref: createRef(item.astNode!.kind, item.name)
    }))

  for (const [name, field] of Object.entries(fields)) {
    methods[name] = {
      ...transformBaseType(field),
      ...field.args.length ? { args: transformArgs(field.args) } : {},
      output: transformType2Usage(field.type) as GraphApiAnyUsage
    }
  }

  return {
    ...transformNamedType(objectType),
    type: {
      kind: isGraphQLInterfaceType(objectType)
        ? GRAPH_API_NODE_KIND_INTERFACE
        : GRAPH_API_NODE_KIND_OBJECT,
      ...Object.keys(methods).length ? { methods: methods } : {},
      ...interfaces.length ? { interfaces } : {},
    },
  }
}

export function transformInputObjectType2Definition(
  inputObjectType: GraphQLInputObjectType
): GraphApiInputObjectDefinition {
  const properties: Record<string, GraphApiArgument> = {}
  const fields = inputObjectType.getFields()

  for (const [name, field] of Object.entries(fields)) {
    properties[name] = {
      ...transformBaseType(field),
      ...transformType2Usage(field.type, false, field.defaultValue),
    } as GraphApiInputUsage
  }

  return {
    ...transformBaseType(inputObjectType),
    title: inputObjectType.name,
    type: {
      kind: GRAPH_API_NODE_KIND_INPUT_OBJECT,
      ...Object.keys(properties).length ? { properties } : {},
    },
  }
}

export function transformUnionType2Definition(
  unionType: GraphQLUnionType
): GraphApiUnionDefinition {
  return {
    ...transformNamedType(unionType),
    type: {
      kind: GRAPH_API_NODE_KIND_UNION,
      oneOf: unionType
        .getTypes()
        .map(item => transformType2Definition(item) as GraphApiAnyDefinition)
    }
  }
}

export function transformEnumType2Definition(
  enumType: GraphQLEnumType
): GraphApiEnumDefinition {
  const enumValues = enumType.getValues().reduce((res, { description, value, astNode }) => {
    res[value] = {
      ...transformUsedDirectives(astNode),
      ...description ? { description } : {},
    }
    return res
  }, {} as Record<string, GraphEnumValue>)

  return {
    ...transformNamedType(enumType),
    type: {
      kind: GRAPH_API_NODE_KIND_ENUM,
      ...Object.keys(enumValues).length ? { values: enumValues } : {}
    },
  }
}
