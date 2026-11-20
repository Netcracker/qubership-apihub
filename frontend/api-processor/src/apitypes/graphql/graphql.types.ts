import { GRAPHQL_DOCUMENT_TYPE, GRAPHQL_TYPE } from './graphql.consts'
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'

import type { ApiOperation, VersionDocument } from '../../types'

export type GraphQLSchemaType = keyof typeof GRAPHQL_TYPE
export type GraphQLMethodType = (typeof GRAPHQL_TYPE)[GraphQLSchemaType]
export type GraphQLDocumentType = (typeof GRAPHQL_DOCUMENT_TYPE)[keyof typeof GRAPHQL_DOCUMENT_TYPE]

export interface GraphQLOperationMeta {
  type: GraphQLMethodType // query | mutation | subscription
  method: string // getQuote
}

export type VersionGraphQLDocument = VersionDocument<GraphApiSchema>

export type VersionGraphQLOperation = ApiOperation<GraphApiSchema, GraphQLOperationMeta>
