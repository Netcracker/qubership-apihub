import { buildUnknownDocument, dumpUnknownDocument } from './unknown.document'
import { UNKNOWN_API_TYPE } from './unknown.consts'
import { parseUnknownFile } from './unknown.parser'
import { ApiBuilder } from '../../types'
import { DOCUMENT_TYPE } from '../../consts'

export * from './unknown.consts'
export { buildBinaryDocument } from './unknown.document'

export const unknownApiBuilder: ApiBuilder<unknown> = {
  apiType: UNKNOWN_API_TYPE,
  types: [DOCUMENT_TYPE.JSON, DOCUMENT_TYPE.YAML, DOCUMENT_TYPE.UNKNOWN],
  parser: parseUnknownFile,
  buildDocument: buildUnknownDocument,
  dumpDocument: dumpUnknownDocument,
}
