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

  return [
    printSchemaDefinition(graphapi),
    ...printTypeDefinitions(graphapi.components),
    printOperations(queryTypeName, graphapi.queries),
    printOperations(mutationTypeName, graphapi.mutations),
    printOperations(subscriptionTypeName, graphapi.subscriptions),
  ].filter(Boolean).join('\n\n')
}
