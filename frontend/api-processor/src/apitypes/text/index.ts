import { buildTextDocument, dumpTextDocument } from './text.document'
import { TEXT_API_TYPE, TEXT_DOCUMENT_TYPE } from './text.consts'
import { parseTextFile } from './text.parser'
import { ApiBuilder } from '../../types'

export * from './text.consts'

export const textApiBuilder: ApiBuilder<string> = {
  apiType: TEXT_API_TYPE,
  types: [TEXT_DOCUMENT_TYPE.MARKDOWN],
  parser: parseTextFile,
  buildDocument: buildTextDocument,
  dumpDocument: dumpTextDocument,
}
