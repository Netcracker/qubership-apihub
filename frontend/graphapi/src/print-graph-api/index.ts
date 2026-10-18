import { GraphApiSchema } from "../types";
import { printOperations, printSchemaDefinition, printTypeDefinitions } from "./root-level.printer";
import {
  GRAPH_QL_MUTATION_TYPE_NAME_DEFAULT,
  GRAPH_QL_QUERY_TYPE_NAME_DEFAULT,
  GRAPH_QL_SUBSCRIPTION_TYPE_NAME_DEFAULT
} from "../constants";

export function printGraphApi(graphapi: GraphApiSchema): string {
  // Use the original root type names if available, otherwise fall back to standard names
  const queryTypeName = graphapi.queryTypeName || GRAPH_QL_QUERY_TYPE_NAME_DEFAULT
  const mutationTypeName = graphapi.mutationTypeName || GRAPH_QL_MUTATION_TYPE_NAME_DEFAULT
  const subscriptionTypeName = graphapi.subscriptionTypeName || GRAPH_QL_SUBSCRIPTION_TYPE_NAME_DEFAULT

  // `components` is threaded into the printers so default values can be printed type-aware
  const { components } = graphapi
  return [
    printSchemaDefinition(graphapi),
    ...printTypeDefinitions(components),
    printOperations(queryTypeName, graphapi.queries, components),
    printOperations(mutationTypeName, graphapi.mutations, components),
    printOperations(subscriptionTypeName, graphapi.subscriptions, components),
  ].filter(Boolean).join('\n\n')
}
