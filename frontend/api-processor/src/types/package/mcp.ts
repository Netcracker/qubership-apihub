export const MCP_KIND = {
  INIT: 'init',
  TOOL: 'tool',
  PROMPT: 'prompt',
  RESOURCE: 'resource',
} as const

export type McpKind = typeof MCP_KIND[keyof typeof MCP_KIND]

/**
 * JSON key that holds the collection for each list kind — the array property in the list document
 * (`{ tools: [...] }`), the `capabilities.*` key, and the per-entity data wrapper key.
 */
export const MCP_COLLECTION_KEY: Record<string, string> = {
  [MCP_KIND.TOOL]: 'tools',
  [MCP_KIND.RESOURCE]: 'resources',
  [MCP_KIND.PROMPT]: 'prompts',
}

export interface McpEntitySearch {
  useEntityDataAsSearchText: boolean
}

/** Stable identifier of an MCP entity: `{endpoint}-{kind}-{name}` (computed, not a fixed set). */
export type McpEntityId = string

export interface PackageMcpEntity {
  mcpEntityId: McpEntityId
  kind: McpKind
  title: string
  description: string
  mcpEndpoint: string
  search: McpEntitySearch
  documentId: string
}

export interface PackageMcpFile {
  inits: PackageMcpEntity[]
  tools: PackageMcpEntity[]
  resources: PackageMcpEntity[]
  prompts: PackageMcpEntity[]
}


export interface McpEntity extends PackageMcpEntity {
  data: Record<string, unknown>
}

/** MCP entities kept flat, keyed by entity id (grouped by kind into `mcp.json` only at serialization). */
export type McpEntityIndex = Map<McpEntityId, McpEntity>
