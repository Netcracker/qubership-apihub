import type { McpKind } from '@netcracker/qubership-apihub-api-processor'

import { MCP_DOCUMENT_TYPE, type McpDocumentType } from '../utils/specs'

/** Browse/API collection segment (wire value, also used in URL search params). */
export const MCP_COLLECTION_INIT = 'init'
export const MCP_COLLECTION_TOOLS = 'tools'
export const MCP_COLLECTION_PROMPTS = 'prompts'
export const MCP_COLLECTION_RESOURCES = 'resources'

export const MCP_COLLECTIONS = [
  MCP_COLLECTION_INIT,
  MCP_COLLECTION_TOOLS,
  MCP_COLLECTION_RESOURCES,
  MCP_COLLECTION_PROMPTS,
] as const

export type McpCollection = (typeof MCP_COLLECTIONS)[number]

export const MCP_COLLECTION_LABELS: Record<McpCollection, string> = {
  [MCP_COLLECTION_INIT]: 'Overview',
  [MCP_COLLECTION_TOOLS]: 'Tools',
  [MCP_COLLECTION_PROMPTS]: 'Prompts',
  [MCP_COLLECTION_RESOURCES]: 'Resources',
}

export const MCP_COLLECTION_EMPTY_MESSAGES: Record<McpCollection, string> = {
  [MCP_COLLECTION_INIT]: 'No endpoints',
  [MCP_COLLECTION_TOOLS]: 'No tools',
  [MCP_COLLECTION_PROMPTS]: 'No prompts',
  [MCP_COLLECTION_RESOURCES]: 'No resources',
}

export type McpContractEntityDto = Readonly<{
  mcpEntityId: string
  kind: McpKind
  title: string
  description?: string
  mcpEndpoint: string
  documentId: string
  versionInternalDocumentId: string
  packageRef?: string
}>

export type McpContractEntityDetailsDto =
  & McpContractEntityDto
  & Readonly<{
    data?: Record<string, unknown>
  }>

export type McpEntity = McpContractEntityDto

export type McpEntityDetails = McpContractEntityDetailsDto

export type McpEndpointSummaryDto = Readonly<{
  toolsCount: number
  promptsCount: number
  resourcesCount: number
}>

export type McpEndpointSummary = McpEndpointSummaryDto

export type McpContractsSummaryDto = Readonly<Record<string, McpEndpointSummaryDto>>

export type McpContractsSummaryTotals = Readonly<{
  endpoints: number
  toolsCount: number
  promptsCount: number
  resourcesCount: number
}>

export type McpContractsSummary = Readonly<{
  byEndpoint: Readonly<Record<string, McpEndpointSummary>>
  totals: McpContractsSummaryTotals
}>

export function mcpCollectionToApiSegment(collection: McpCollection): string {
  return collection === MCP_COLLECTION_INIT ? 'inits' : collection
}

export function parseMcpCollectionParam(value: string | undefined): McpCollection | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === 'overview') {
    return MCP_COLLECTION_INIT
  }
  return MCP_COLLECTIONS.find(collection => collection === value)
}

export function toMcpContractsSummary(dto: McpContractsSummaryDto | undefined): McpContractsSummary | undefined {
  if (!dto) {
    return undefined
  }

  const endpointKeys = Object.keys(dto)
  if (endpointKeys.length === 0) {
    return undefined
  }

  const byEndpoint: Record<string, McpEndpointSummary> = {}
  let toolsCount = 0
  let promptsCount = 0
  let resourcesCount = 0

  for (const endpoint of endpointKeys) {
    const { toolsCount: tools = 0, promptsCount: prompts = 0, resourcesCount: resources = 0 } = dto[endpoint]!
    byEndpoint[endpoint] = { toolsCount: tools, promptsCount: prompts, resourcesCount: resources }
    toolsCount += tools
    promptsCount += prompts
    resourcesCount += resources
  }

  return {
    byEndpoint: byEndpoint,
    totals: {
      endpoints: endpointKeys.length,
      toolsCount: toolsCount,
      promptsCount: promptsCount,
      resourcesCount: resourcesCount,
    },
  }
}

export function hasMcpContracts(mcp?: McpContractsSummary): mcp is McpContractsSummary {
  if (!mcp) {
    return false
  }
  return mcp.totals.endpoints > 0
}

export function toMcpEntity(dto: McpContractEntityDto): McpEntity {
  return dto
}

export function getMcpEntityDisplayName(
  entity: Readonly<Pick<McpEntity, 'title' | 'mcpEntityId'>>,
): string {
  return entity.title || entity.mcpEntityId
}

export function getMcpEntityDescription(
  entity: Readonly<Pick<McpEntity, 'description'>>,
): string | undefined {
  const { description } = entity
  if (typeof description !== 'string') {
    return undefined
  }
  const trimmed = description.trim()
  return trimmed === '' ? undefined : trimmed
}

export function compareMcpDocumentTypes(typeA: McpDocumentType, typeB: McpDocumentType): number {
  const orderA = MCP_COLLECTIONS.indexOf(MCP_DOCUMENT_SPEC_TYPE_TO_COLLECTION[typeA])
  const orderB = MCP_COLLECTIONS.indexOf(MCP_DOCUMENT_SPEC_TYPE_TO_COLLECTION[typeB])
  return orderA - orderB
}

const MCP_DOCUMENT_SPEC_TYPE_TO_COLLECTION: Record<McpDocumentType, McpCollection> = {
  [MCP_DOCUMENT_TYPE.MCP_INIT]: MCP_COLLECTION_INIT,
  [MCP_DOCUMENT_TYPE.MCP_TOOLS]: MCP_COLLECTION_TOOLS,
  [MCP_DOCUMENT_TYPE.MCP_PROMPTS]: MCP_COLLECTION_PROMPTS,
  [MCP_DOCUMENT_TYPE.MCP_RESOURCES]: MCP_COLLECTION_RESOURCES,
}
