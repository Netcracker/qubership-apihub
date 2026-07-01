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
