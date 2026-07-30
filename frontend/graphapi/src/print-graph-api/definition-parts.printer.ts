import { GraphApiAnyDefinition, GraphApiArgs, GraphApiArgument, GraphApiComponents, GraphApiDirective, GraphApiInputObjectDefinition, GraphApiInputUsage, GraphApiObjectDefinition, GraphApiObjectKind, GraphApiOperation, GraphApiRef } from "../types"
import { printString } from "./atomics.printer"
import { printBlock, printDescription, printOriginalType, typeName } from "./atomics.printer"
import { GRAPH_API_DEFAULT_INDENT } from "./declarations"
import { isGraphApiListDefinition, isGraphApiRef, isObject } from "../guards"

export function printImplementedInterfaces(interfaces: GraphApiRef[] = []): string {
  return interfaces.length
    ? ' implements ' + interfaces.map(typeName).join(' & ')
    : ''
}

const printObjectLiteral = (fields: string[]): string => `{${fields.join(', ')}}`
const printListLiteral = (items: string[]): string => `[${items.join(', ')}]`

// Prints a JS value as a GraphQL literal: strings quoted, numbers/booleans/null bare, lists and
// objects printed recursively. Without type information enum values print quoted, like strings.
export function printValueLiteral(value: unknown): string {
  if (value === null) { return 'null' }
  if (typeof value === 'string') { return printString(value) }
  if (typeof value === 'number' || typeof value === 'boolean') { return String(value) }
  if (Array.isArray(value)) {
    return printListLiteral(value.map(printValueLiteral))
  }
  if (isObject(value)) {
    return printObjectLiteral(Object.entries(value)
      .map(([name, fieldValue]) => `${name}: ${printValueLiteral(fieldValue)}`))
  }
  return String(value)
}

// Prints a value as a GraphQL literal, staying type-aware via its `typeDef` (`$ref`s resolved
// through `components`):
//   enum          → unquoted           (e.g. ASC)
//   input-object  → { field: value }   (each field recursed with its own type)
//   list          → [ item, ... ]      (each item recursed with its own type)
//   other/unknown → printValueLiteral  (structural literal)
function printTypedValue(
  value: unknown,
  typeDef: GraphApiRef | GraphApiAnyDefinition | undefined,
  components: GraphApiComponents,
): string {
  if (value === null) { return 'null' }

  // A `$ref` (`#/components/<section>/<name>`) names an enum or input-object component.
  if (isGraphApiRef(typeDef)) {
    const [, , section, name] = typeDef.$ref!.split('/')
    if (section === 'enums' && typeof value === 'string') {
      return value
    }
    if (section === 'inputObjects' && isObject(value) && !Array.isArray(value)) {
      const properties = components.inputObjects?.[name]?.type.properties ?? {}
      return printObjectLiteral(Object.entries(value).map(([field, fieldValue]) =>
        `${field}: ${printTypedValue(fieldValue, properties[field]?.typeDef, components)}`))
    }
  }

  // A list type is inline (`type.kind === 'list'`) — recurse with the item type.
  if (isGraphApiListDefinition(typeDef) && Array.isArray(value)) {
    const itemTypeDef = typeDef.type.items?.typeDef
    return printListLiteral(value.map(item => printTypedValue(item, itemTypeDef, components)))
  }

  return printValueLiteral(value)
}

// Returns the printable GraphQL literal for a usage's default value, or `undefined` if it has none.
function resolveDefault(usage: GraphApiInputUsage, components: GraphApiComponents): string | undefined {
  if (usage.default === undefined) { return undefined }
  return printTypedValue(usage.default, usage.typeDef, components)
}

export function printFields(
  object: GraphApiObjectDefinition<GraphApiObjectKind>,
  components: GraphApiComponents = {}
): string {
  const fieldList: [string, GraphApiOperation][] = Object.entries(object.type.methods ?? {})

  const fields = fieldList.map(([name, field], i) => {
    return (
      printDescription(field.description, GRAPH_API_DEFAULT_INDENT, !i) +
      GRAPH_API_DEFAULT_INDENT +
      name +
      printArgsDefinition(field.args, GRAPH_API_DEFAULT_INDENT, components) +
      ': ' +
      printOriginalType(field.output.typeDef, field.output.nullable === undefined) +
      printUsedDirectives(field.directives)
    )
  })
  return printBlock(fields)
}

export function printInputFields(
  object: GraphApiInputObjectDefinition,
  components: GraphApiComponents = {}
): string {
  const fieldList: [string, GraphApiArgument][] = Object.entries(object.type.properties ?? {})

  const fields = fieldList.map(([name, field], i) => {
    const printedDefault = resolveDefault(field, components)
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

export function printArgsDefinition(
  args?: GraphApiArgs,
  indentation = '',
  components: GraphApiComponents = {}
): string {
  if (!args) { return '' }

  const argList = Object.entries(args ?? {})

  if (argList.length === 0) { return '' }

  // If every arg does not have a description, print them on one line.
  const isSingleLineArgs = argList.every(([, arg]) => !arg.description)

  if (isSingleLineArgs) {
    return '(' + argList
      .map(([name, arg]) => printArgDefinition(name, arg, '', true, components))
      .filter(arg => arg !== undefined)
      .join(', ') + ')'
  }

  return (
    '(\n' + argList
      .map(([name, arg], i) => {
        const indent = GRAPH_API_DEFAULT_INDENT + indentation
        const first = i === 0
        return printArgDefinition(name, arg, indent, first, components)
      })
      .join('\n') + '\n' + indentation + ')'
  )
}

export function printArgDefinition(
  name: string,
  arg: GraphApiArgument,
  indent: string = '',
  first: boolean = true,
  components: GraphApiComponents = {}
): string {
  const printedDefault = resolveDefault(arg, components)

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

export function printProvidedArgValue(value: unknown): string {
  return value === undefined ? '' : printValueLiteral(value)
}

export function printUsedDirectives(directives?: Record<string, GraphApiDirective>): string {
  if (!directives) { return '' }
  const printedDirectives = []
  for (const [name, directive] of Object.entries(directives)) {
    printedDirectives.push(`@${name}${printUsedDirectiveArgs(directive.meta)}`)
  }
  return printedDirectives.length ? ' ' + printedDirectives.join(' ') : ''
}
