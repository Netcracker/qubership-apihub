import { describe, expect, test } from '@jest/globals'
import { DocumentTypeCase, publishDocumentTypeCase } from './helpers'
import { DOCUMENT_TYPE } from '../src/consts'
import { MCP_DOCUMENT_TYPE } from '../src/apitypes/mcp/mcp.consts'

const { UNKNOWN } = DOCUMENT_TYPE

const MCP_INIT = '{"protocolVersion": "2025-06-18", "capabilities": {}, "serverInfo": {"name": "s", "version": "1"}}'

// an MCP document is built only when its file names the endpoint it was read from
const MCP_FILE = { metadata: { mcpEndpoint: '/mcp' } }

const MCP_ROWS: DocumentTypeCase[] = [
  {
    name: 'an MCP initialization result',
    fileId: 'spec.json',
    content: MCP_INIT,
    type: MCP_DOCUMENT_TYPE.MCP_INIT,
    errored: false,
    fileConfig: MCP_FILE,
  },
  {
    name: 'an MCP tools list published without its initialization result',
    fileId: 'spec.json',
    content: '{"tools": [{"name": "search", "inputSchema": {"type": "object"}}]}',
    type: MCP_DOCUMENT_TYPE.MCP_TOOLS,
    errored: true,
    fileConfig: MCP_FILE,
  },
  // the type is read from the parsed object, so a file that does not parse was never recognized
  {
    name: 'an MCP tools list cut short',
    fileId: 'spec.json',
    content: '{"tools": [',
    type: UNKNOWN,
    errored: true,
    fileConfig: MCP_FILE,
  },
]

describe('The document type of an MCP file', () => {
  test.each(MCP_ROWS)('should publish $name as $type, errored: $errored', async (row) => {
    expect(await publishDocumentTypeCase('mcp', row)).toEqual({ type: row.type, errored: row.errored })
  }, 30000)
})
