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

import { buildAsyncApiDocument, dumpAsyncApiDocument } from './async.document'
import { buildAsyncApiOperations } from './async.operations'
import { ASYNCAPI_API_TYPE, ASYNC_DOCUMENT_TYPE } from './async.consts'
import { parseAsyncApiFile } from './async.parser'
import { ApiBuilder } from '../../types'
import { compareDocuments } from './async.changes'
import { AsyncApiDocument } from './async.types'

export * from './async.consts'
export * from './async.types'

export const asyncApiBuilder: ApiBuilder<AsyncApiDocument> = {
  apiType: ASYNCAPI_API_TYPE,
  types: Object.values(ASYNC_DOCUMENT_TYPE),
  parser: parseAsyncApiFile,
  buildDocument: buildAsyncApiDocument,
  buildOperations: buildAsyncApiOperations,
  dumpDocument: dumpAsyncApiDocument,
  compareDocuments: compareDocuments,
}

