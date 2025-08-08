/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'

import { buildGraphQLDocument, dumpGraphQLDocument } from './graphql.document'
import { buildGraphQLOperations } from './graphql.operations'
import { GRAPHQL_API_TYPE, GRAPHQL_DOCUMENT_TYPE } from './graphql.consts'
import { parseGraphQLFile } from './graphql.parser'
import { ApiBuilder } from '../../types'
import { compareDocuments, graphqlOperationsCompare } from './graphql.changes'

export * from './graphql.consts'

export const graphqlApiBuilder: ApiBuilder<GraphApiSchema> = {
  apiType: GRAPHQL_API_TYPE,
  types: Object.values(GRAPHQL_DOCUMENT_TYPE),
  parser: parseGraphQLFile,
  buildDocument: buildGraphQLDocument,
  buildOperations: buildGraphQLOperations,
  dumpDocument: dumpGraphQLDocument,
  compareOperationsData: graphqlOperationsCompare,
  compareDocuments: compareDocuments,
}
