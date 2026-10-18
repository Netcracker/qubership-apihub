import { normalize } from '@netcracker/qubership-apihub-api-unifier'
import { buildFromSchema, GraphApiSchema, printGraphApi } from '@netcracker/qubership-apihub-graphapi'
import { buildSchema } from 'graphql'
import { GRAPHQL_TYPE } from '../apitypes/graphql/graphql.consts'
import { createOperationSpec } from '../apitypes/graphql/graphql.operation'
import { GraphQLSchemaType } from '../apitypes/graphql/graphql.types'
import { INLINE_REFS_FLAG } from '../consts'
import { calculateGraphqlOperationId } from './operations.utils'

export function parseGraphQLSource(source: string): GraphApiSchema {
  return buildFromSchema(
    buildSchema(source, { noLocation: true }),
  )
}

export function normalizeGraphQL(sourceDocument: GraphApiSchema): GraphApiSchema {
  return normalize(
    sourceDocument,
    {
      mergeAllOf: false,
      inlineRefsFlag: INLINE_REFS_FLAG,
      source: sourceDocument,
    },
  ) as GraphApiSchema
}

export function cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument(
  rawGraphQlDocument: string,
  operationType: GraphQLSchemaType,
  operationKey: string,
): string {
  const sourceSchema = parseGraphQLSource(rawGraphQlDocument)

  const normalizedSchema = normalizeGraphQL(sourceSchema)

  const operationId = calculateGraphqlOperationId(GRAPHQL_TYPE[operationType], operationKey)
  const spec = createOperationSpec(sourceSchema, normalizedSchema, [operationId])

  return printGraphApi(spec)
}
