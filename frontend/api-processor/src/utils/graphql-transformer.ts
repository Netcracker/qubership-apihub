import { normalize } from '@netcracker/qubership-apihub-api-unifier'
import { buildFromSchema, GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { buildSchema } from 'graphql'
import { calculateSpecRefs, cropToSingleOperation } from '../apitypes/graphql/graphql.operation'
import { GraphQLSchemaType } from '../apitypes/graphql/graphql.types'
import { INLINE_REFS_FLAG } from '../consts'
import { removeComponents } from './operations.utils'

export function transformRawGraphQlDocumentToTruncatedGraphApiSchema(
  rawGraphQlDocument: string,
  operationType: GraphQLSchemaType,
  operationKey: string,
): GraphApiSchema {
  const rawGraphApiSchema =
    buildFromSchema(
      buildSchema(
        rawGraphQlDocument,
        { noLocation: true },
      ),
    )

  const rawGraphApiSchemaWithoutComponents = removeComponents(rawGraphApiSchema) as GraphApiSchema
  const refsOnlyGraphApiSchema = normalize(
    rawGraphApiSchemaWithoutComponents,
    {
      mergeAllOf: false,
      inlineRefsFlag: INLINE_REFS_FLAG,
      source: rawGraphApiSchema,
    },
  ) as GraphApiSchema

  const graphApiSchemaSingleOperation: GraphApiSchema =
    cropToSingleOperation(rawGraphApiSchema, operationType, operationKey)
  const refsOnlyGraphApiSchemaSingleOperation: GraphApiSchema =
    cropToSingleOperation(refsOnlyGraphApiSchema, operationType, operationKey)

  calculateSpecRefs(
    rawGraphApiSchema,
    refsOnlyGraphApiSchemaSingleOperation,
    graphApiSchemaSingleOperation,
  )

  return graphApiSchemaSingleOperation
}
