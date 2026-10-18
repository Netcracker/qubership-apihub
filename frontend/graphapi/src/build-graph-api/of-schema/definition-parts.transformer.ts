import {
  GraphQLNullableType,
  SchemaDefinitionNode,
  ScalarTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  EnumTypeDefinitionNode,
  UnionTypeDefinitionNode,
  FieldDefinitionNode,
  EnumValueDefinitionNode,
  InputValueDefinitionNode,
  ConstDirectiveNode,
  DEFAULT_DEPRECATION_REASON,
  ConstValueNode,
  GraphQLArgument
} from "graphql"
import { BUILT_IN_DIRECTIVES_SET, GRAPH_API_NODE_KIND_LIST } from "../../constants"
import { getScalarType } from "../utils"
import { GraphApiRef, GraphApiScalarDefinition, GraphApiListDefinition, GraphApiAnyUsage, GraphApiUsage, GraphApiDirective, GraphApiArgs, GraphApiArgument, GraphApiInputUsage } from "../../types"
import { transformBaseType } from "./atomics.transformer"
import { USED_BUILT_IN_DIRECTIVES } from "./declarations"
import { createRef, getTypeKind } from "./utils"
import { isListType, isNonNullType, isScalarType } from "../../guards"

export function transformType2Definition(
  gqlType: GraphQLNullableType
): GraphApiRef | GraphApiScalarDefinition | GraphApiListDefinition {
  if (isListType(gqlType)) {
    return {
      type: {
        kind: GRAPH_API_NODE_KIND_LIST,
        items: transformType2Usage(gqlType.ofType) as GraphApiAnyUsage,
      }
    }
  }
  if (isScalarType(gqlType)) {
    const scalarType = getScalarType(gqlType)
    if (scalarType.kind !== 'scalar') {
      return { type: scalarType }
    }
  }
  return {
    $ref: createRef(getTypeKind(gqlType), gqlType.name)
  }
}

export function transformType2Usage(
  gqlType: GraphQLNullableType,
  notNullable: boolean = false,
  defaultValue?: unknown
): GraphApiUsage {
  if (isNonNullType(gqlType)) {
    return transformType2Usage(gqlType.ofType, true, defaultValue)
  }
  const hasDefaultValue = defaultValue !== undefined
  return {
    typeDef: transformType2Definition(gqlType),
    ...notNullable ? { nullable: false } : {},
    ...hasDefaultValue ? { default: defaultValue } : {},
  } as GraphApiAnyUsage
}

export function transformUsedDirectives(
  astNode?:
    | SchemaDefinitionNode
    | ScalarTypeDefinitionNode
    | ObjectTypeDefinitionNode
    | InterfaceTypeDefinitionNode
    | InputObjectTypeDefinitionNode
    | EnumTypeDefinitionNode
    | UnionTypeDefinitionNode
    | FieldDefinitionNode
    | EnumValueDefinitionNode
    | InputValueDefinitionNode
    | null
) {
  const directives = (astNode?.directives ?? [])
    .reduce((result: Record<string, GraphApiDirective>, value: ConstDirectiveNode) => {
      result[value.name.value] = transformUsedDirective(value)
      return result
    }, {})
  return Object.keys(directives).length > 0 ? { directives } : {}
}

export function transformUsedDirective(node: ConstDirectiveNode): any {
  const meta = node.arguments?.reduce((args: Record<string, any>, arg) => {
    args[arg.name.value] = transformUsedDirectiveArgValue(arg.value)
    return args
  }, {})

  const calculateMeta = () => {
    if (node.name.value === 'deprecated' && !node.arguments?.length) {
      return { meta: { reason: DEFAULT_DEPRECATION_REASON } }
    } else { return {} }
  }

  const directiveName = node.name.value
  if (BUILT_IN_DIRECTIVES_SET.has(directiveName)) {
    USED_BUILT_IN_DIRECTIVES.add(node.name.value)
  }
  return {
    definition: { $ref: createRef('DirectiveDefinition', directiveName) },
    ...meta && Object.keys(meta).length ? { meta } : calculateMeta(),
  }
}

export function transformUsedDirectiveArgValue(arg: ConstValueNode): any {
  switch (arg.kind) {
    case 'IntValue':
      return Number.parseInt(arg.value)
    case 'FloatValue':
      return Number.parseFloat(arg.value)
    case 'EnumValue':
    case 'BooleanValue':
    case 'StringValue':
      return arg.value
    case 'NullValue':
      return null
    case 'ListValue':
      return arg.values.map(transformUsedDirectiveArgValue)
    case 'ObjectValue':
      return arg.fields.reduce((result, item) => {
        result[item.name.value] = transformUsedDirectiveArgValue(item.value)
        return result
      }, {} as any)
  }
}

export function transformArgs(args: ReadonlyArray<GraphQLArgument>): GraphApiArgs {
  const transformedArgs: Record<string, GraphApiArgument> = {}

  for (const arg of args) {
    transformedArgs[arg.name] = {
      ...transformBaseType(arg),
      ...transformType2Usage(arg.type, false, arg.defaultValue),
    } as GraphApiInputUsage
  }

  return { ...transformedArgs }
}
