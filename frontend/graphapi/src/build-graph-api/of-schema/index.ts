import { GraphQLSchema } from "graphql"
import { GRAPH_API_VERSION } from "../../constants"
import { GraphApiSchema } from "../../types"
import { transformBaseType } from "./atomics.transformer"
import { USED_BUILT_IN_DIRECTIVES } from "./declarations"
import { transformDirectiveTypes2Definitions } from "./definitions.transformer"
import { transformDefinitions, transformOperations } from "./root-level.transformer"

export function buildFromSchema(schema: GraphQLSchema): GraphApiSchema {
  USED_BUILT_IN_DIRECTIVES.clear()

  const qType = schema.getQueryType()
  const mType = schema.getMutationType()
  const sType = schema.getSubscriptionType()

  const schemaDefinition = transformBaseType(schema)
  const operationsDefinitions = {
    ...qType ? { queries: transformOperations(qType.getFields()) } : {},
    ...mType ? { mutations: transformOperations(mType.getFields()) } : {},
    ...sType ? { subscriptions: transformOperations(sType.getFields()) } : {},
  }

  // skip Query, Mutation and Subscription in components
  const skippedTypes = [qType, mType, sType].reduce((r: string[], i) => i ? [...r, i.name] : r, [])
  const typeDefinitions = transformDefinitions(schema.getTypeMap(), skippedTypes)
  const directiveDefinitions = transformDirectiveTypes2Definitions(schema.getDirectives())

  const hasComponents = Object.keys(typeDefinitions).length > 0 || Object.keys(directiveDefinitions).length > 0

  return {
    graphapi: GRAPH_API_VERSION,
    ...schemaDefinition,
    ...operationsDefinitions,
    ...hasComponents ? { components: { ...typeDefinitions, ...directiveDefinitions } } : {},
  }
}
