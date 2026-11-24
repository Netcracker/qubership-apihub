import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'

import { buildGraphQLDocument, dumpGraphQLDocument } from './graphql.document'
import { buildGraphQLOperations } from './graphql.operations'
import { GRAPHQL_DOCUMENT_TYPE } from './graphql.consts'
import { parseGraphQLFile } from './graphql.parser'
import { ApiBuilder } from '../../types'
import { compareDocuments } from './graphql.changes'
import { GRAPHQL_API_TYPE } from '../../consts'

export * from './graphql.consts'

export const graphqlApiBuilder: ApiBuilder<GraphApiSchema> = {
  apiType: GRAPHQL_API_TYPE,
  types: Object.values(GRAPHQL_DOCUMENT_TYPE),
  parser: parseGraphQLFile,
  buildDocument: buildGraphQLDocument,
  buildOperations: buildGraphQLOperations,
  dumpDocument: dumpGraphQLDocument,
  compareDocuments: compareDocuments,
}
