import { OpenAPIV3 } from 'openapi-types'

import { buildRestDocument, createRestExportDocument, dumpRestDocument } from './rest.document'
import { REST_DOCUMENT_TYPE } from './rest.consts'
import { compareDocuments } from './rest.changes'
import { buildRestOperations } from './rest.operations'
import { parseRestFile } from './rest.parser'
import { ApiBuilder } from '../../types'
import { restOperationIdNormalizer } from '../../utils'
import { REST_API_TYPE } from '../../consts'

export * from './rest.consts'
export type { RestOperationData } from './rest.types'
export { createCopyWithPrefixGroupOperationsOnly } from './rest.changes'

export const restApiBuilder: ApiBuilder<OpenAPIV3.Document> = {
  apiType: REST_API_TYPE,
  types: Object.values(REST_DOCUMENT_TYPE),
  parser: parseRestFile,
  buildDocument: buildRestDocument,
  buildOperations: buildRestOperations,
  dumpDocument: dumpRestDocument,
  compareDocuments: compareDocuments,
  createNormalizedOperationId: restOperationIdNormalizer,
  createExportDocument: createRestExportDocument,
}
