import type { IntrospectionInputValue, IntrospectionInterfaceType, IntrospectionObjectType } from "graphql";
import { ComponentsKind, INTROSPECTION_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP } from "./declarations";

export function createRef(kind: ComponentsKind, name: string): string {
  return `#/components/${INTROSPECTION_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP[kind]}/${name}`
}

export function isIntrospectionInterfaceType(
  objectType: IntrospectionObjectType | IntrospectionInterfaceType): objectType is IntrospectionInterfaceType {
  return objectType.kind === 'INTERFACE'
}

export function getDefaultValue(arg: IntrospectionInputValue) {
  if (!arg.defaultValue || !("name" in arg.type)) {
    return arg.defaultValue
  }
  switch (arg.type.name) {
    case 'Int':
    case 'Float':
      return +arg.defaultValue

    case 'Boolean':
      return arg.defaultValue === "true"
  }
  return arg.defaultValue
}
