import { buildAsyncApiDocument, dumpAsyncApiDocument } from './async.document'
import { buildAsyncApiOperations } from './async.operations'
import { ASYNC_DOCUMENT_TYPE } from './async.consts'
import { parseAsyncApiFile } from './async.parser'
import { ApiBuilder } from '../../types'
import { compareDocuments } from './async.changes'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { ASYNCAPI_API_TYPE } from '../../consts'

export * from './async.consts'
export * from './async.types'

export const asyncApiBuilder: ApiBuilder<AsyncAPIV3.AsyncAPIObject> = {
  apiType: ASYNCAPI_API_TYPE,
  types: Object.values(ASYNC_DOCUMENT_TYPE),
  parser: parseAsyncApiFile,
  buildDocument: buildAsyncApiDocument,
  buildOperations: buildAsyncApiOperations,
  dumpDocument: dumpAsyncApiDocument,
  compareDocuments: compareDocuments,
}

