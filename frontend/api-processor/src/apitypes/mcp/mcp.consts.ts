import { ZippableDocument } from '../../types'
import { ResolvedVersionDocument } from '../../types/external'

export const MCP_DOCUMENT_TYPE = {
  MCP_INIT: 'mcp-init',
  MCP_TOOLS: 'mcp-tools',
  MCP_RESOURCES: 'mcp-resources',
  MCP_PROMPTS: 'mcp-prompts',
} as const

export type McpDocumentType = typeof MCP_DOCUMENT_TYPE[keyof typeof MCP_DOCUMENT_TYPE]

export function isMcpDocument(document: ZippableDocument | ResolvedVersionDocument): boolean {
  return Object.values(MCP_DOCUMENT_TYPE).some(type => document.type === type)
}
