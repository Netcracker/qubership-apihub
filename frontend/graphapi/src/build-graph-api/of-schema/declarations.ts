export const USED_BUILT_IN_DIRECTIVES = new Set<string>()

export const SCHEMA_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP = {
  ScalarTypeDefinition: 'scalars',
  ObjectTypeDefinition: 'objects',
  InterfaceTypeDefinition: 'interfaces',
  InputObjectTypeDefinition: 'inputObjects',
  DirectiveDefinition: 'directives',
  UnionTypeDefinition: 'unions',
  EnumTypeDefinition: 'enums'
} as const

export type ComponentsKind = keyof typeof SCHEMA_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP
