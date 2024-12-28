import { GRAPH_API_NODE_KIND_BOOLEAN, GRAPH_API_NODE_KIND_FLOAT, GRAPH_API_NODE_KIND_ID, GRAPH_API_NODE_KIND_INTEGER, GRAPH_API_NODE_KIND_SCALAR, GRAPH_API_NODE_KIND_STRING } from "../constants"
import { hasGraphApiEntityType, isGraphApiEnumDefinition, isGraphApiInputObjectDefinition, isGraphApiObjectiveDefinition, isGraphApiRef, isGraphApiScalarDefinition, isGraphApiUnionDefinition } from "../guards"
import { GraphApiAnyDefinition, GraphApiComponentsKind, GraphApiListDefinition, GraphApiRef } from "../types"
import { isPrintableMultilineString } from "./utils"
import { Maybe } from "./declarations"
import { GRAPH_API_KIND_TO_GRAPH_QL_TYPE } from "../constants"
import { TypePrinter } from "./declarations"
import { printDirectiveDefinition, printEnum, printInputObject, printInterface, printObject, printScalar, printUnion } from "./definitions.printer"

export function typePrinter(componentKind: GraphApiComponentsKind): Maybe<TypePrinter> {
  switch (componentKind) {
    case "directives": return printDirectiveDefinition
    case "scalars": return printScalar
    case "objects": return printObject
    case "interfaces": return printInterface
    case "unions": return printUnion
    case "enums": return printEnum
    case "inputObjects": return printInputObject
  }
}

export function typeName(entity: GraphApiRef | GraphApiAnyDefinition) {
  if (isGraphApiRef(entity)) {
    return entity.$ref?.split("/").pop()
  }
  if (hasGraphApiEntityType(entity)) {
    const originalType = GRAPH_API_KIND_TO_GRAPH_QL_TYPE[entity.type.kind]
    return typeof originalType === 'function' ? originalType(entity) : originalType
  }
  return undefined
}

export function printBlock(items: ReadonlyArray<string>): string {
  return items.length !== 0 ? ' {\n' + items.join('\n') + '\n}' : ''
}

export function printOriginalType(schema?: GraphApiRef | GraphApiListDefinition | GraphApiAnyDefinition, nullable = true): string {
  if (!schema) {
    return ''
  }
  const postfix = nullable === false ? '!' : ''
  if (isGraphApiRef(schema)) {
    return schema.$ref!.split("/").pop() + postfix
  }
  if (isGraphApiScalarDefinition(schema)) {
    switch (schema.type.kind) {
      case GRAPH_API_NODE_KIND_ID: return 'ID' + postfix
      case GRAPH_API_NODE_KIND_STRING: return 'String' + postfix
      case GRAPH_API_NODE_KIND_INTEGER: return 'Int' + postfix
      case GRAPH_API_NODE_KIND_FLOAT: return 'Float' + postfix
      case GRAPH_API_NODE_KIND_BOOLEAN: return 'Boolean' + postfix
      case GRAPH_API_NODE_KIND_SCALAR: return schema.title! + postfix
    }
  }
  if (
    isGraphApiEnumDefinition(schema) ||
    isGraphApiUnionDefinition(schema) ||
    isGraphApiObjectiveDefinition(schema) ||
    isGraphApiInputObjectDefinition(schema)
  ) {
    return schema.title! + postfix
  }
  return `[${printOriginalType(schema.type.items?.typeDef, schema.type.items?.nullable)}]${postfix}`
}

export function printDescription(value?: string, indent = '', firstInBlock = true): string {
  if (!value) { return '' }

  const result = isPrintableMultilineString(value)
    ? printMultilineString(value)
    : printString(value)

  const prefix = indent && !firstInBlock ? '\n' + indent : indent

  return prefix + result.replace(/\n/g, '\n' + indent) + '\n'
}

export function printString(str: string): string {
  return `"${str}"`
}

export function printMultilineString(str: string): string {
  return '"""\n' + `${str}\n` + '"""'
}
