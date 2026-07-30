import type { IntrospectionInputValue, IntrospectionInterfaceType, IntrospectionObjectType } from "graphql";
import { parseValue, valueFromASTUntyped } from "graphql";
import { ComponentsKind, INTROSPECTION_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP } from "./declarations";

export function createRef(kind: ComponentsKind, name: string): string {
  return `#/components/${INTROSPECTION_COMPONENT_TO_GRAPHAPI_COMPONENT_MAP[kind]}/${name}`
}

export function isIntrospectionInterfaceType(
  objectType: IntrospectionObjectType | IntrospectionInterfaceType): objectType is IntrospectionInterfaceType {
  return objectType.kind === 'INTERFACE'
}

export function getDefaultValue(arg: IntrospectionInputValue): unknown {
  // Introspection stores `defaultValue` as the printed SDL literal string. Parse it into a coerced
  // JS value (input-object → object, enum/string → string, Int/Float → number, list → array, ...),
  // matching the of-schema representation so the printer can render defaults type-aware.
  if (typeof arg.defaultValue !== 'string') { return undefined }
  try {
    return valueFromASTUntyped(parseValue(arg.defaultValue))
  } catch {
    return undefined
  }
}
