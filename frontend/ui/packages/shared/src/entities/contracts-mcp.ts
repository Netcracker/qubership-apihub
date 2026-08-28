import { MCP_KIND, type McpKind } from '@netcracker/qubership-apihub-api-processor'

import { MCP_DOCUMENT_TYPE, type McpDocumentType } from '../utils/specs'
import { toOptionalTrimmedString, truncateDescription } from '../utils/strings'
import { getContractListKey } from './contracts'
import { type PackageRef, type PackagesRefs, toPackageRef } from './operations'

export { MCP_KIND, type McpKind }

/* Browse/API collection segments (wire values; also used in URL search params). */
export const MCP_COLLECTION_INIT = 'init'
export const MCP_COLLECTION_TOOLS = 'tools'
export const MCP_COLLECTION_PROMPTS = 'prompts'
export const MCP_COLLECTION_RESOURCES = 'resources'

/* UI/URL order: Overview, then Tools → Prompts → Resources. */
export const MCP_COLLECTIONS = [
  MCP_COLLECTION_INIT,
  MCP_COLLECTION_TOOLS,
  MCP_COLLECTION_PROMPTS,
  MCP_COLLECTION_RESOURCES,
] as const

export type McpCollection = (typeof MCP_COLLECTIONS)[number]

export const MCP_LIST_COLLECTIONS = [
  MCP_COLLECTION_TOOLS,
  MCP_COLLECTION_PROMPTS,
  MCP_COLLECTION_RESOURCES,
] as const

export type McpListCollection = (typeof MCP_LIST_COLLECTIONS)[number]

export const MCP_COLLECTION_LABELS: Record<McpCollection, string> = {
  [MCP_COLLECTION_INIT]: 'Overview',
  [MCP_COLLECTION_TOOLS]: 'Tools',
  [MCP_COLLECTION_PROMPTS]: 'Prompts',
  [MCP_COLLECTION_RESOURCES]: 'Resources',
}

export const MCP_COLLECTION_EMPTY_MESSAGES: Record<McpListCollection, string> = {
  [MCP_COLLECTION_TOOLS]: 'No tools',
  [MCP_COLLECTION_PROMPTS]: 'No prompts',
  [MCP_COLLECTION_RESOURCES]: 'No resources',
}

export const MCP_EMPTY_SCOPE_MESSAGE = 'No MCP'

type McpKindDefinition = Readonly<{
  mcpDocumentType: McpDocumentType
  mcpCollection: McpCollection
  mcpEntityTitle: string
}>

const MCP_KIND_DEFINITIONS = {
  [MCP_KIND.INIT]: {
    mcpDocumentType: MCP_DOCUMENT_TYPE.MCP_INIT,
    mcpCollection: MCP_COLLECTION_INIT,
    mcpEntityTitle: 'MCP Overview',
  },
  [MCP_KIND.TOOL]: {
    mcpDocumentType: MCP_DOCUMENT_TYPE.MCP_TOOLS,
    mcpCollection: MCP_COLLECTION_TOOLS,
    mcpEntityTitle: 'MCP Tool',
  },
  [MCP_KIND.PROMPT]: {
    mcpDocumentType: MCP_DOCUMENT_TYPE.MCP_PROMPTS,
    mcpCollection: MCP_COLLECTION_PROMPTS,
    mcpEntityTitle: 'MCP Prompt',
  },
  [MCP_KIND.RESOURCE]: {
    mcpDocumentType: MCP_DOCUMENT_TYPE.MCP_RESOURCES,
    mcpCollection: MCP_COLLECTION_RESOURCES,
    mcpEntityTitle: 'MCP Resource',
  },
} as const satisfies Record<McpKind, McpKindDefinition>

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

export type McpEntitiesDto = Readonly<{
  entities: ReadonlyArray<McpContractEntityDto>
  packages?: PackagesRefs
}>

export type McpContractEntity = Readonly<{
  mcpEntityId: string
  kind: McpKind
  title: string
  description?: string
  mcpEndpoint: string
  packageRef?: PackageRef
}>

export type McpContractEntityDetails =
  & McpContractEntity
  & Readonly<{
    data?: Record<string, unknown>
  }>

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

export function getMcpKindDefinition(kind: McpKind): McpKindDefinition {
  return MCP_KIND_DEFINITIONS[kind]
}

export function getMcpCollectionForDocumentType(documentType: McpDocumentType): McpCollection {
  return findMcpKindDefinitionBy(
    definition => definition.mcpDocumentType === documentType,
  ).mcpCollection
}

export function getMcpDocumentTypeForCollection(collection: McpCollection): McpDocumentType {
  return findMcpKindDefinitionBy(
    definition => definition.mcpCollection === collection,
  ).mcpDocumentType
}

export function mcpCollectionToApiSegment(collection: McpCollection): string {
  return collection === MCP_COLLECTION_INIT ? 'inits' : collection
}

export function parseMcpCollectionParam(value: string | undefined): McpCollection | undefined {
  if (value === undefined) {
    return undefined
  }
  return MCP_COLLECTIONS.find(collection => collection === value)
}

export function parseMcpListCollectionParam(
  value: string | undefined,
): McpListCollection | undefined {
  if (value === undefined) {
    return undefined
  }
  return MCP_LIST_COLLECTIONS.find(collection => collection === value)
}

export function toMcpContractsSummary(dto: McpContractsSummaryDto | undefined): McpContractsSummary | undefined {
  if (!dto) {
    return undefined
  }

  const endpointKeys = Object.keys(dto)
  if (endpointKeys.length === 0) {
    return undefined
  }

  let toolsCount = 0
  let promptsCount = 0
  let resourcesCount = 0

  for (const endpoint of endpointKeys) {
    const { toolsCount: tools = 0, promptsCount: prompts = 0, resourcesCount: resources = 0 } = dto[endpoint]!
    toolsCount += tools
    promptsCount += prompts
    resourcesCount += resources
  }

  return {
    byEndpoint: dto,
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

export function toMcpContractEntity(
  dto: McpContractEntityDto,
  packagesRefs?: PackagesRefs,
): McpContractEntity {
  return {
    mcpEntityId: dto.mcpEntityId,
    kind: dto.kind,
    title: dto.title,
    description: truncateDescription(dto.description),
    mcpEndpoint: dto.mcpEndpoint,
    packageRef: toPackageRef(dto.packageRef, packagesRefs),
  }
}

export function toMcpContractEntities(dto: McpEntitiesDto): ReadonlyArray<McpContractEntity> {
  return dto.entities?.map(entity => toMcpContractEntity(entity, dto.packages)) ?? []
}

export function getMcpContractEntityListKey(
  entity: Readonly<Pick<McpContractEntity, 'mcpEntityId' | 'packageRef'>>,
): string {
  return getContractListKey(entity.packageRef, entity.mcpEntityId)
}

export function getMcpContractEntityDisplayName(
  entity: Readonly<Pick<McpContractEntity, 'title' | 'mcpEntityId'>>,
): string {
  return entity.title || entity.mcpEntityId
}

export function getMcpContractEntityToolbarTitle(
  entity: Readonly<Pick<McpContractEntity, 'title' | 'mcpEntityId' | 'kind'>>,
): string {
  return `${getMcpKindDefinition(entity.kind).mcpEntityTitle}: ${getMcpContractEntityDisplayName(entity)}`
}

export function getMcpContractEntityDescription(
  entity: Readonly<Pick<McpContractEntity, 'description'>>,
): string | undefined {
  return toOptionalTrimmedString(entity.description)
}

export function compareMcpDocumentTypes(typeA: McpDocumentType, typeB: McpDocumentType): number {
  const orderA = MCP_COLLECTIONS.indexOf(getMcpCollectionForDocumentType(typeA))
  const orderB = MCP_COLLECTIONS.indexOf(getMcpCollectionForDocumentType(typeB))
  return orderA - orderB
}

function findMcpKindDefinitionBy(
  predicate: (definition: McpKindDefinition) => boolean,
): McpKindDefinition {
  for (const kind of Object.keys(MCP_KIND_DEFINITIONS) as McpKind[]) {
    const definition = MCP_KIND_DEFINITIONS[kind]
    if (predicate(definition)) {
      return definition
    }
  }
  throw new Error('Unknown MCP kind definition lookup')
}
