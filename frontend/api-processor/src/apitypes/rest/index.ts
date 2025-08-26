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

import { OpenAPIV3 } from 'openapi-types'

import { buildRestDocument, createRestExportDocument, dumpRestDocument } from './rest.document'
import { REST_API_TYPE, REST_DOCUMENT_TYPE } from './rest.consts'
import { compareDocuments } from './rest.changes'
import { buildRestOperations, createNormalizedOperationId } from './rest.operations'
import { parseRestFile } from './rest.parser'

import { ApiBuilder } from '../../types'

export * from './rest.consts'

export const restApiBuilder: ApiBuilder<OpenAPIV3.Document> = {
  apiType: REST_API_TYPE,
  types: Object.values(REST_DOCUMENT_TYPE),
  parser: parseRestFile,
  buildDocument: buildRestDocument,
  buildOperations: buildRestOperations,
  dumpDocument: dumpRestDocument,
  compareDocuments: compareDocuments,
  createNormalizedOperationId: createNormalizedOperationId,
  createExportDocument: createRestExportDocument,
}
