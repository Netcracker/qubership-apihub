import { GraphQLNamedType } from 'graphql';
import { isScalarType } from '../../guards';
import { ComponentsKind, SCHEMA_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP } from './declarations';

export function getTypeKind(gqlType: GraphQLNamedType): ComponentsKind {
  return isScalarType(gqlType) || !gqlType.astNode ? 'ScalarTypeDefinition' : gqlType.astNode!.kind
}

export function createRef(kind: ComponentsKind, name: string): string {
  return `#/components/${SCHEMA_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP[kind]}/${name}`
}
