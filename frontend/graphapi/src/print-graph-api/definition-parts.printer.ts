import { GraphApiArgs, GraphApiArgument, GraphApiDirective, GraphApiInputObjectDefinition, GraphApiObjectDefinition, GraphApiObjectKind, GraphApiOperation, GraphApiRef } from "../types"
import { printString } from "./atomics.printer"
import { printBlock, printDescription, printOriginalType, typeName } from "./atomics.printer"
import { GRAPH_API_DEFAULT_INDENT } from "./declarations"

export function printImplementedInterfaces(interfaces: GraphApiRef[] = []): string {
  return interfaces.length
    ? ' implements ' + interfaces.map(typeName).join(' & ')
    : ''
}

export function printFields(object: GraphApiObjectDefinition<GraphApiObjectKind>): string {
  const fieldList: [string, GraphApiOperation][] = Object.entries(object.type.methods ?? {})

  let printedDefault = 'default' in object ? object.default : undefined
  if (typeof printedDefault === 'string') {
    printedDefault = `"${printedDefault}"`
  }

  const fields = fieldList.map(([name, field], i) => {
    return (
      printDescription(field.description, GRAPH_API_DEFAULT_INDENT, !i) +
      GRAPH_API_DEFAULT_INDENT +
      name +
      printArgsDefinition(field.args, GRAPH_API_DEFAULT_INDENT) +
      ': ' +
      printOriginalType(field.output.typeDef, field.output.nullable === undefined) +
      (printedDefault !== undefined ? ` = ${printedDefault}` : '') +
      printUsedDirectives(field.directives)
    )
  })
  return printBlock(fields)
}

export function printInputFields(object: GraphApiInputObjectDefinition): string {
  const fieldList: [string, GraphApiArgument][] = Object.entries(object.type.properties ?? {})

  let printedDefault = 'default' in object ? object.default : undefined
  if (typeof printedDefault === 'string') {
    printedDefault = `"${printedDefault}"`
  }

  const fields = fieldList.map(([name, field], i) => {
    return (
      printDescription(field.description, GRAPH_API_DEFAULT_INDENT, i === 0) +
      GRAPH_API_DEFAULT_INDENT +
      name +
      ': ' +
      printOriginalType(field.typeDef, field.nullable === undefined) +
      (printedDefault !== undefined ? ` = ${printedDefault}` : '') +
      printUsedDirectives(field.directives)
    )
  })
  return printBlock(fields)
}

export function printArgsDefinition(args?: GraphApiArgs, indentation = ''): string {
  if (!args) { return '' }

  const argList = Object.entries(args ?? {})

  if (argList.length === 0) { return '' }

  // If every arg does not have a description, print them on one line.
  const isSingleLineArgs = argList.every(([, arg]) => !arg.description)

  if (isSingleLineArgs) {
    return '(' + argList
      .map(([name, arg]) => printArgDefinition(name, arg))
      .filter(arg => arg !== undefined)
      .join(', ') + ')'
  }

  return (
    '(\n' + argList
      .map(([name, arg], i) => {
        const indent = GRAPH_API_DEFAULT_INDENT + indentation
        const first = i === 0
        return printArgDefinition(name, arg, indent, first)
      })
      .join('\n') + '\n' + indentation + ')'
  )
}

export function printArgDefinition(
  name: string,
  arg: GraphApiArgument,
  indent: string = '',
  first: boolean = true
): string {
  let printedDefault = 'default' in arg ? arg.default : undefined
  if (typeof printedDefault === 'string') {
    printedDefault = `"${printedDefault}"`
  }

  return (
    printDescription(arg.description, indent, first) +
    indent +
    name +
    ': ' +
    printOriginalType(arg.typeDef, arg.nullable !== false) +
    (printedDefault !== undefined ? ` = ${printedDefault}` : '') +
    printUsedDirectives(arg.directives)
  )
}

export function printUsedDirectiveArgs(argsMeta: Record<string, any> = {}) {
  const argList = Object.entries(argsMeta)
  if (!argList.length) { return "" }
  return '(' + argList.map(([name, value]) => `${name}: ${printProvidedArgValue(value)}`).join(', ') + ')'
}

export function printProvidedArgValue(value: any) {
  if (value === undefined) { return '' }
  if (typeof value === 'string') { return printString(value) }
  return String(value)
}

export function printUsedDirectives(directives?: Record<string, GraphApiDirective>): string {
  if (!directives) { return '' }
  const printedDirectives = []
  for (const [name, directive] of Object.entries(directives)) {
    printedDirectives.push(`@${name}${printUsedDirectiveArgs(directive.meta)}`)
  }
  return printedDirectives.length ? ' ' + printedDirectives.join(' ') : ''
}
