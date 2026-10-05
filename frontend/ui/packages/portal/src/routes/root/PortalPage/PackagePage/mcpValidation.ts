import { unwrapJsonRpc } from '@netcracker/qubership-apihub-api-processor'

import {
  getMcpCollectionForDocumentType,
  getMcpDocumentTypeForCollection,
  MCP_COLLECTION_LABELS,
  MCP_LIST_COLLECTIONS,
  type McpCollection,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import { isObject } from '@netcracker/qubership-apihub-ui-shared/utils/objects'
import { MCP_DOCUMENT_TYPE, type McpDocumentType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'

import type { McpStagedFileMeta } from '@portal/routes/root/PortalPage/PackagePage/mcpPublish'

export type McpUploadCandidate = Readonly<{
  documentType: McpDocumentType
}>

export type McpEndpointValidation = Readonly<{
  mcpEndpoint: string
  error?: string
  warning?: string
}>

export type McpValidationInput = Readonly<{
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>
  initFileContents: ReadonlyMap<string, string>
}>

const MCP_INIT_REQUIRED_TOOLTIP =
  'An Overview (init) artifact is required for this MCP endpoint. Publish is disabled until an Overview is added.'

export function hasDuplicateMcpTypesInBatch(
  candidates: ReadonlyArray<McpUploadCandidate>,
): boolean {
  const seenDocumentTypes = new Set<McpDocumentType>()
  for (const candidate of candidates) {
    if (seenDocumentTypes.has(candidate.documentType)) {
      return true
    }
    seenDocumentTypes.add(candidate.documentType)
  }
  return false
}

export function formatMcpEndpointReplaceStagedFileAlertMessage(
  mcpEndpoint: string,
  uploadDocumentTypes: ReadonlyArray<McpDocumentType>,
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>,
): string {
  const trimmedEndpoint = mcpEndpoint.trim()
  if (trimmedEndpoint === '') {
    return ''
  }

  const existingDocumentTypesOnEndpoint = collectDocumentTypesOnEndpoint(mcpStagedFileMetaByName, trimmedEndpoint)
  const conflictingMcpCollections = collectConflictingMcpCollections(
    uploadDocumentTypes,
    existingDocumentTypesOnEndpoint,
  )
  if (conflictingMcpCollections.length === 0) {
    return ''
  }

  if (conflictingMcpCollections.length === 1) {
    const [collection] = conflictingMcpCollections
    const collectionLabel = toMcpCollectionLabel(collection)
    return `This endpoint already has ${formatIndefiniteArticle(collectionLabel)} ${collectionLabel} artifact. ` +
      `Saving will replace the existing file in ${trimmedEndpoint}.`
  }

  const collectionLabels = conflictingMcpCollections.map(toMcpCollectionLabel)
  const collectionsList = formatListWithAnd(collectionLabels)
  return `This endpoint already has ${collectionsList} artifacts. ` +
    `Saving will replace the existing files in ${trimmedEndpoint}.`
}

export function collectMcpEndpointValidations(
  input: McpValidationInput,
): ReadonlyMap<string, McpEndpointValidation> {
  const validations = new Map<string, McpEndpointValidation>()

  applyMissingInitValidations(validations, input.mcpStagedFileMetaByName)
  applyCapabilityWarningValidations(validations, input.mcpStagedFileMetaByName, input.initFileContents)

  return validations
}

export function hasBlockingMcpValidations(
  validations: ReadonlyMap<string, McpEndpointValidation>,
): boolean {
  return [...validations.values()].some(validation => validation.error !== undefined)
}

export function getPublishDisabledHint(
  validations: ReadonlyMap<string, McpEndpointValidation>,
): string | undefined {
  for (const validation of validations.values()) {
    if (validation.error === MCP_INIT_REQUIRED_TOOLTIP) {
      return `You can't publish a version without an Overview (Init) artifact in the MCP Endpoint: ${validation.mcpEndpoint}.`
    }
  }

  for (const validation of validations.values()) {
    if (validation.error !== undefined) {
      return validation.error
    }
  }

  return undefined
}

function collectDocumentTypesOnEndpoint(
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>,
  mcpEndpoint: string,
): Set<McpDocumentType> {
  const documentTypes = new Set<McpDocumentType>()
  for (const meta of mcpStagedFileMetaByName.values()) {
    if (meta.mcpEndpoint === mcpEndpoint) {
      documentTypes.add(meta.documentType)
    }
  }
  return documentTypes
}

function collectConflictingMcpCollections(
  uploadDocumentTypes: ReadonlyArray<McpDocumentType>,
  existingDocumentTypesOnEndpoint: ReadonlySet<McpDocumentType>,
): ReadonlyArray<McpCollection> {
  const mcpCollections: McpCollection[] = []
  const seenMcpCollections = new Set<McpCollection>()
  for (const documentType of uploadDocumentTypes) {
    if (!existingDocumentTypesOnEndpoint.has(documentType)) {
      continue
    }
    const mcpCollection = getMcpCollectionForDocumentType(documentType)
    if (seenMcpCollections.has(mcpCollection)) {
      continue
    }
    seenMcpCollections.add(mcpCollection)
    mcpCollections.push(mcpCollection)
  }
  return mcpCollections
}

function toMcpCollectionLabel(mcpCollection: McpCollection): string {
  return MCP_COLLECTION_LABELS[mcpCollection]
}

function formatIndefiniteArticle(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a'
}

function formatListWithAnd(items: ReadonlyArray<string>): string {
  if (items.length <= 1) {
    return items[0] ?? ''
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`
  }
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function formatCapabilityWarningTooltip(capabilityLabel: string): string {
  return `Your overview artifact declares ${capabilityLabel}, but no ${capabilityLabel} artifact is attached.`
}

function applyMissingInitValidations(
  validations: Map<string, McpEndpointValidation>,
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>,
): void {
  const endpoints = new Set<string>()
  const endpointsWithInit = new Set<string>()

  for (const meta of mcpStagedFileMetaByName.values()) {
    endpoints.add(meta.mcpEndpoint)
    if (meta.documentType === MCP_DOCUMENT_TYPE.MCP_INIT) {
      endpointsWithInit.add(meta.mcpEndpoint)
    }
  }

  for (const mcpEndpoint of endpoints) {
    if (endpointsWithInit.has(mcpEndpoint)) {
      continue
    }
    validations.set(mcpEndpoint, {
      mcpEndpoint: mcpEndpoint,
      error: MCP_INIT_REQUIRED_TOOLTIP,
    })
  }
}

function applyCapabilityWarningValidations(
  validations: Map<string, McpEndpointValidation>,
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>,
  initFileContents: ReadonlyMap<string, string>,
): void {
  const documentTypesByEndpoint = groupDocumentTypesByEndpoint(mcpStagedFileMetaByName)

  for (const [fileName, meta] of mcpStagedFileMetaByName.entries()) {
    if (meta.documentType !== MCP_DOCUMENT_TYPE.MCP_INIT) {
      continue
    }
    if (validations.get(meta.mcpEndpoint)?.error !== undefined) {
      continue
    }
    if (validations.get(meta.mcpEndpoint)?.warning !== undefined) {
      continue
    }

    const capabilities = parseInitCapabilities(initFileContents.get(fileName))
    if (!capabilities) {
      continue
    }

    const stagedTypes = documentTypesByEndpoint.get(meta.mcpEndpoint) ?? new Set<McpDocumentType>()
    for (const collection of MCP_LIST_COLLECTIONS) {
      if (!capabilities[collection]) {
        continue
      }
      const documentType = getMcpDocumentTypeForCollection(collection)
      if (stagedTypes.has(documentType)) {
        continue
      }
      validations.set(meta.mcpEndpoint, {
        mcpEndpoint: meta.mcpEndpoint,
        warning: formatCapabilityWarningTooltip(MCP_COLLECTION_LABELS[collection]),
      })
      break
    }
  }
}

function groupDocumentTypesByEndpoint(
  mcpStagedFileMetaByName: ReadonlyMap<string, McpStagedFileMeta>,
): Map<string, Set<McpDocumentType>> {
  const grouped = new Map<string, Set<McpDocumentType>>()
  for (const meta of mcpStagedFileMetaByName.values()) {
    const types = grouped.get(meta.mcpEndpoint) ?? new Set<McpDocumentType>()
    types.add(meta.documentType)
    grouped.set(meta.mcpEndpoint, types)
  }
  return grouped
}

function parseInitCapabilities(text: string | undefined): Record<string, unknown> | undefined {
  if (text === undefined || text === '') {
    return undefined
  }

  try {
    const parsed = JSON.parse(text) as unknown
    if (!isObject(parsed)) {
      return undefined
    }
    const document = unwrapJsonRpc(parsed)
    if (!isObject(document)) {
      return undefined
    }
    const { capabilities } = document
    return isObject(capabilities) ? capabilities : undefined
  } catch {
    return undefined
  }
}
