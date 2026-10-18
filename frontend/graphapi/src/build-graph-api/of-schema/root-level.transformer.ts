import { GraphQLEnumType, GraphQLField, GraphQLInputObjectType, GraphQLInterfaceType, GraphQLNamedType, GraphQLObjectType, GraphQLScalarType, GraphQLUnionType } from 'graphql';
import { GraphApiAnyDefinition, GraphApiAnyUsage, GraphApiOperation } from '../../types';
import { transformBaseType } from './atomics.transformer';
import { SCHEMA_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP } from './declarations';
import { transformArgs, transformType2Usage } from './definition-parts.transformer';
import { transformEnumType2Definition, transformInputObjectType2Definition, transformObjectType2Definition, transformScalarType2Definition, transformUnionType2Definition } from './definitions.transformer';
import { getTypeKind } from './utils';

export function transformDefinition(gqlType: GraphQLNamedType): GraphApiAnyDefinition {
  const kind = getTypeKind(gqlType)
  switch (kind) {
    case 'ScalarTypeDefinition':
      return transformScalarType2Definition(gqlType as GraphQLScalarType)
    case 'ObjectTypeDefinition':
      return transformObjectType2Definition(gqlType as GraphQLObjectType)
    case 'InterfaceTypeDefinition':
      return transformObjectType2Definition(gqlType as GraphQLInterfaceType)
    case 'InputObjectTypeDefinition':
      return transformInputObjectType2Definition(gqlType as GraphQLInputObjectType)
    case 'UnionTypeDefinition':
      return transformUnionType2Definition(gqlType as GraphQLUnionType)
    case 'EnumTypeDefinition':
      return transformEnumType2Definition(gqlType as GraphQLEnumType)
    default:
      throw new Error('Unsupported type')
  }
}

export function transformDefinitions(
  gqlTypeMap: Record<string, GraphQLNamedType>,
  skip: string[] = []
): Record<string, Record<string, GraphApiAnyDefinition>> {
  const result: Record<string, Record<string, GraphApiAnyDefinition>> = {}
  for (const [name, gqlType] of Object.entries(gqlTypeMap)) {
    if (['String', 'Int', 'Float', 'Boolean', 'ID'].includes(name)) {
      continue
    }
    if (name.startsWith('__') || skip.includes(name)) {
      continue
    }
    const kind = getTypeKind(gqlType)
    result[SCHEMA_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP[kind]] = result[SCHEMA_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP[kind]] || {}
    result[SCHEMA_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP[kind]][name] = transformDefinition(gqlType)
  }
  return result
}

export function transformOperations(fields: Record<string, GraphQLField<any, any>>): Record<string, GraphApiOperation> {
  const operations: Record<string, GraphApiOperation> = {}
  for (const [name, field] of Object.entries(fields)) {
    operations[name] = {
      ...transformBaseType(field),
      ...field.args.length ? { args: transformArgs(field.args) } : {},
      output: transformType2Usage(field.type) as GraphApiAnyUsage
    }
  }
  return operations
}
