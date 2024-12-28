import { GraphApiSchema } from "../types";
import { printOperations, printSchemaDefinition, printTypeDefinitions } from "./root-level.printer";

export function printGraphApi(graphapi: GraphApiSchema): string {
  return [
    printSchemaDefinition(graphapi),
    ...printTypeDefinitions(graphapi.components),
    printOperations("Query", graphapi.queries),
    printOperations("Mutation", graphapi.mutations),
    printOperations("Subscription", graphapi.subscriptions),
  ].filter(Boolean).join('\n')
}
