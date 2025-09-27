import { GraphApiSchema } from "../types";
import { printOperations, printSchemaDefinition, printTypeDefinitions } from "./root-level.printer";

export function printGraphApi(graphapi: GraphApiSchema): string {
  // Use the original root type names if available, otherwise fall back to standard names
  const queryTypeName = graphapi.queryTypeName || 'Query'
  const mutationTypeName = graphapi.mutationTypeName || 'Mutation'
  const subscriptionTypeName = graphapi.subscriptionTypeName || 'Subscription'

  return [
    printSchemaDefinition(graphapi),
    ...printTypeDefinitions(graphapi.components),
    printOperations(queryTypeName, graphapi.queries),
    printOperations(mutationTypeName, graphapi.mutations),
    printOperations(subscriptionTypeName, graphapi.subscriptions),
  ].filter(Boolean).join('\n\n')
}
