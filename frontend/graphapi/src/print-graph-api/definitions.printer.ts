import { GRAPH_API_NODE_KIND_OBJECT, GRAPH_API_NODE_KIND_INTERFACE, BUILT_IN_DIRECTIVES } from "../constants"
import { GraphApiDirectiveDefinition, GraphApiScalarDefinition, GraphApiObjectDefinition, GraphApiUnionDefinition, GraphApiEnumDefinition, GraphApiInputObjectDefinition } from "../types"
import { printDescription, typeName, printBlock } from "./atomics.printer"
import { BUILT_IN_SCALARS, GRAPH_API_DEFAULT_INDENT } from "./declarations"
import { printArgsDefinition, printUsedDirectives, printImplementedInterfaces, printFields, printInputFields } from "./definition-parts.printer"

export function printDirectiveDefinition(name: string, directive: GraphApiDirectiveDefinition): string {
  if (BUILT_IN_DIRECTIVES.some(builtInDirectiveName => builtInDirectiveName === name)) { return "" }

  return (
    printDescription(directive.description) +
    'directive @' +
    name +
    printArgsDefinition(directive.args) +
    (directive.repeatable ? ' repeatable' : '') +
    ' on ' +
    directive.locations.join(' | ')
  )
}

export function printScalar(name: string, type: GraphApiScalarDefinition): string {
  if (BUILT_IN_SCALARS.some(builtInScalarName => builtInScalarName === name)) { return "" }

  return (
    printDescription(type.description) +
    `scalar ${name}` +
    printUsedDirectives(type.directives)
  )
}

export function printObject(name: string, type: GraphApiObjectDefinition<typeof GRAPH_API_NODE_KIND_OBJECT>): string {
  return (
    printDescription(type.description) +
    `type ${name}` +
    printUsedDirectives(type.directives) +
    printImplementedInterfaces(type.type.interfaces) +
    printFields(type)
  )
}

export function printInterface(name: string, type: GraphApiObjectDefinition<typeof GRAPH_API_NODE_KIND_INTERFACE>): string {
  return (
    printDescription(type.description) +
    `interface ${name}` +
    printUsedDirectives(type.directives) +
    printImplementedInterfaces(type.type.interfaces) +
    printFields(type)
  )
}

export function printUnion(name: string, type: GraphApiUnionDefinition): string {
  const types = type.type.oneOf.map((item) => typeName(item))
  if (types.length === 0) { return '' }
  return (
    printDescription(type.description) +
    `union ${name}` +
    printUsedDirectives(type.directives) +
    ' = ' + types.join(' | ')
  )
}

export function printEnum(name: string, type: GraphApiEnumDefinition): string {
  const values = Object.entries(type.type.values ?? {}).map(([key, value], i) => {
    return (
      printDescription(value.description, GRAPH_API_DEFAULT_INDENT, i === 0) +
      GRAPH_API_DEFAULT_INDENT +
      key +
      printUsedDirectives(value.directives)
    )
  })

  return (
    printDescription(type.description) +
    `enum ${name}` +
    printUsedDirectives(type.directives) +
    printBlock(values)
  )
}

export function printInputObject(name: string, type: GraphApiInputObjectDefinition): string {
  return (
    printDescription(type.description) +
    `input ${name}` +
    printUsedDirectives(type.directives) +
    printInputFields(type)
  )
}
