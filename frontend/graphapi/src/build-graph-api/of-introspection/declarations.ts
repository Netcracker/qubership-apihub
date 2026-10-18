
export const USED_BUILT_IN_DIRECTIVES = new Set<string>()

export const INTROSPECTION_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP = {
  SCALAR: "scalars",
  OBJECT: "objects",
  INTERFACE: "interfaces",
  INPUT_OBJECT: "inputObjects",
  DERICTIVE: "directives",
  UNION: "unions",
  ENUM: "enums"
} as const

export type ComponentsKind = keyof typeof INTROSPECTION_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP
