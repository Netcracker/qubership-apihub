import { describe, expect, test } from '@jest/globals'
import { DocumentTypeCase, publishDocumentTypeCase } from './helpers'
import { DOCUMENT_TYPE } from '../src/consts'
import { TEXT_DOCUMENT_TYPE } from '../src/apitypes/text/text.consts'

const { UNKNOWN } = DOCUMENT_TYPE

// files no API parser claims
const NON_API_ROWS: DocumentTypeCase[] = [
  { name: 'a Markdown file', fileId: 'readme.md', content: '# Title\n', type: TEXT_DOCUMENT_TYPE.MARKDOWN, errored: false },
  { name: 'a text file', fileId: 'notes.txt', content: 'Notes.\n', type: UNKNOWN, errored: false },
  // the extension is not one the build reads, so no parser sees the content
  { name: 'an image', fileId: 'logo.png', content: 'not really an image', type: UNKNOWN, errored: false },
  { name: 'JSON under an extension the build does not read', fileId: 'spec.docx', content: '{"openapi": "3.0.0"}', type: UNKNOWN, errored: false },
  { name: 'YAML that is no API', fileId: 'config.yaml', content: 'key: value\n', type: UNKNOWN, errored: false },
  { name: 'YAML that is no API and does not parse', fileId: 'config.yaml', content: 'key: "unclosed\n', type: UNKNOWN, errored: true },
  // nothing to recognize
  { name: 'an empty Markdown file', fileId: 'readme.md', content: '', type: TEXT_DOCUMENT_TYPE.MARKDOWN, errored: false },
]

describe('The document type of a file that is no API', () => {
  test.each(NON_API_ROWS)('should publish $name as $type, errored: $errored', async (row) => {
    expect(await publishDocumentTypeCase('non-api', row)).toEqual({ type: row.type, errored: row.errored })
  }, 30000)
})
