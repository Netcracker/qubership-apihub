import { ApiBuilder } from '../../types'
import { MCP_DOCUMENT_TYPE } from './mcp.consts'
import { MCP_CONTRACT_TYPE } from '../../consts'
import { parseMcpFile } from './mcp.parser'
import { buildMcpDocument, dumpMcpDocument } from './mcp.document'
import { buildMcpEntities } from './mcp.entities'
import { ParsedMcpData } from './mcp.types'

export * from './mcp.consts'
export * from './mcp.entities'
export * from './mcp.parser'
export * from './mcp.types'

export const mcpBuilder: ApiBuilder<ParsedMcpData> = {
  apiType: MCP_CONTRACT_TYPE,
  types: Object.values(MCP_DOCUMENT_TYPE),
  parser: parseMcpFile,
  buildDocument: buildMcpDocument,
  dumpDocument: dumpMcpDocument,
  buildMcpEntities,
}
