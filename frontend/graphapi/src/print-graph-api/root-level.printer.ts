import { GRAPH_API_NODE_KIND_OBJECT } from "../constants"
import { GraphApiSchema, GraphApiObjectDefinition, GraphApiObjectKind, GraphApiComponents } from "../types"
import { printDescription, printBlock, typePrinter } from "./atomics.printer"
import { GRAPH_API_COMPONENT_KINDS, Maybe } from "./declarations"
import { printUsedDirectives } from "./definition-parts.printer"
import { printObject } from "./definitions.printer"

export function printSchemaDefinition(schema: GraphApiSchema): Maybe<string> {
  const queriesCount = Object.keys(schema.queries || {}).length
  const mutationionsCount = Object.keys(schema.mutations || {}).length
  const subscriptionsCount = Object.keys(schema.subscriptions || {}).length

  if (!queriesCount && !mutationionsCount && !subscriptionsCount) { return }

  // Use the original root type names if available, otherwise fall back to standard names
  const queryTypeName = schema.queryTypeName || 'Query'
  const mutationTypeName = schema.mutationTypeName || 'Mutation'
  const subscriptionTypeName = schema.subscriptionTypeName || 'Subscription'

  // Determine if we need a schema definition:
  // 1. If there's a description, or
  // 2. If using non-standard root type names (not Query/Mutation/Subscription)
  const hasCustomRootTypes = (queriesCount && queryTypeName !== 'Query') ||
                             (mutationionsCount && mutationTypeName !== 'Mutation') ||
                             (subscriptionsCount && subscriptionTypeName !== 'Subscription')

  if (schema.description || hasCustomRootTypes) {
    const block = []
    queriesCount && block.push(`  query: ${queryTypeName}`)
    mutationionsCount && block.push(`  mutation: ${mutationTypeName}`)
    subscriptionsCount && block.push(`  subscription: ${subscriptionTypeName}`)
    return (
      printDescription(schema.description) +
      'schema' +
      printUsedDirectives(schema.directives) +
      printBlock(block)
    )
  }
}

export function printOperations(
  name: string,
  operations?: GraphApiObjectDefinition<GraphApiObjectKind>['type']['methods']
): string {
  if (!operations) { return "" }
  return printObject(name, {
    title: name,
    type: {
      kind: GRAPH_API_NODE_KIND_OBJECT,
      methods: operations,
    },
  })
}

export function printTypeDefinitions(components: GraphApiComponents = {}): string[] {
  const printedTypes: string[] = []

  for (const kind of GRAPH_API_COMPONENT_KINDS) {
    const printType = typePrinter(kind)!
    const definitions = components[kind]

    if (!definitions) { continue }

    for (const [name, definition] of Object.entries(definitions)) {
      printedTypes.push(printType(name, definition))
    }
  }

  return printedTypes
}