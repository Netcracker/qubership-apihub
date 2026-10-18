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

import { ApiBuilder, BuildConfigFile, VersionDocument } from '../types'
import {
  MCP_COLLECTION_KEY,
  MCP_KIND,
  McpEntity,
  McpEntityIndex,
  McpKind,
  PackageMcpFile,
} from '../types/package/mcp'
import { NotificationMessage } from '../types/package'
import { MCP_DOCUMENT_TYPE } from '../apitypes/mcp'
import { isObject, isString, setReportingDuplicate } from '../utils'
import { MESSAGE_CATEGORY, MESSAGE_SEVERITY } from '../consts'
import { Claims, collectClaim, listDocuments, reportCollisions } from './duplicate-resolution'
import { getMcpSchemaValidator, isSupportedMcpVersion, SUPPORTED_MCP_VERSIONS } from '../apitypes/mcp/mcp.validation'

// MCP document type → the kind whose official definition validates it (see getMcpSchemaValidator).
const MCP_DOCUMENT_TYPE_TO_KIND: Record<string, McpKind> = {
  [MCP_DOCUMENT_TYPE.MCP_INIT]: MCP_KIND.INIT,
  [MCP_DOCUMENT_TYPE.MCP_TOOLS]: MCP_KIND.TOOL,
  [MCP_DOCUMENT_TYPE.MCP_RESOURCES]: MCP_KIND.RESOURCE,
  [MCP_DOCUMENT_TYPE.MCP_PROMPTS]: MCP_KIND.PROMPT,
}

export interface McpBuildContext {
  mcpEntities: McpEntityIndex
}

export function createMcpBuildContext(): McpBuildContext {
  return {
    mcpEntities: new Map(),
  }
}

/** All a collision needs to know about a claimant: which document derived the id. */
export interface McpClaim {
  documentId: string
}

/**
 * Grade every MCP entity id two or more documents derived, reading `mcpEntityClaims` off the documents.
 *
 * Used by the editor's incremental rebuild, which has no built entities of its own to collect from.
 */
export function reportMcpCollisionsOf(
  documents: Iterable<VersionDocument>,
  notifications: NotificationMessage[],
): void {
  const claims: Claims<McpClaim> = new Map()
  for (const document of documents) {
    for (const mcpEntityId of document.mcpEntityClaims ?? []) {
      collectClaim(claims, mcpEntityId, { documentId: document.slug })
    }
  }
  reportMcpCollisions(claims, notifications)
}

/** Cross-document MCP entity collisions, one message per claimant — see `reportCollisions`. */
export function reportMcpCollisions(claims: Claims<McpClaim>, notifications: NotificationMessage[]): void {
  reportCollisions(
    claims,
    notifications,
    MESSAGE_CATEGORY.McpDuplicateEntity,
    () => MESSAGE_SEVERITY.Error,
    (mcpEntityId, documentIds) =>
      `Duplicate MCP entity ID '${mcpEntityId}' found in different documents: ${listDocuments(documentIds)}`,
  )
}

/** Everything the document builds, claimed by nobody yet — see `indexMcpEntities`. */
export function buildDocumentMcpEntities(
  file: BuildConfigFile,
  document: VersionDocument,
  builder: ApiBuilder,
  notifications?: NotificationMessage[],
): McpEntity[] {
  return builder.buildMcpEntities ? builder.buildMcpEntities(document, file, notifications) : []
}

/** Claim the document's entities in the build's index — the operations rule, for MCP. */
export function indexMcpEntities(
  document: VersionDocument,
  entities: McpEntity[],
  ctx: McpBuildContext,
): void {
  for (const entity of entities) {
    setReportingDuplicate(ctx.mcpEntities, entity.mcpEntityId, entity)
  }
  // everything this document built; `reconcileOwnedIds` prunes what another document ends up owning
  document.mcpEntityIds = entities.map(({ mcpEntityId }) => mcpEntityId)
  // kept whole, and what `reportMcpCollisionsOf` grades a collision from
  document.mcpEntityClaims = entities.map(({ mcpEntityId }) => mcpEntityId)
}

/** Build and claim in one step, for the editor's incremental rebuild. */
export function processMcpDocument(
  file: BuildConfigFile,
  document: VersionDocument,
  builder: ApiBuilder,
  ctx: McpBuildContext,
  notifications?: NotificationMessage[],
): void {
  if (!builder.buildMcpEntities) { return }
  // the stream reaches the per-entity catch in `buildMcpEntities`
  indexMcpEntities(document, buildDocumentMcpEntities(file, document, builder, notifications), ctx)
}

export const KIND_TO_FIELD: Record<McpKind, keyof PackageMcpFile> = {
  [MCP_KIND.INIT]: 'inits',
  [MCP_KIND.TOOL]: 'tools',
  [MCP_KIND.RESOURCE]: 'resources',
  [MCP_KIND.PROMPT]: 'prompts',
}

/** Group the flat entity index into the per-kind shape written to `mcp.json`, keyed by `KIND_TO_FIELD`. */
export function groupMcpEntitiesByKind(entities: McpEntityIndex): PackageMcpFile {
  const grouped: PackageMcpFile = { inits: [], tools: [], resources: [], prompts: [] }
  for (const { data: _data, ...index } of entities.values()) {
    // mcp.json is the lightweight index; payloads live in mcp/{id}
    grouped[KIND_TO_FIELD[index.kind]].push(index)
  }
  return grouped
}

/**
 * Require an init for every endpoint the version publishes.
 *
 * The init is the endpoint's mandatory descriptor, so entities published without one describe an incomplete
 * MCP server. Several documents can publish on one endpoint, and the failure belongs to all of them: each
 * gets its own message, because one message listing them would leave every one of them unflagged.
 */
export function validateMcpInitRequired(entities: McpEntityIndex, notifications: NotificationMessage[]): void {
  const documentsByEndpoint = new Map<string, Set<string>>()
  const endpointsWithInit = new Set<string>()
  for (const entity of entities.values()) {
    const documents = documentsByEndpoint.get(entity.mcpEndpoint) ?? new Set<string>()
    documents.add(entity.documentId)
    documentsByEndpoint.set(entity.mcpEndpoint, documents)
    if (entity.kind === MCP_KIND.INIT) { endpointsWithInit.add(entity.mcpEndpoint) }
  }

  for (const [endpoint, documents] of documentsByEndpoint) {
    if (endpointsWithInit.has(endpoint)) { continue }
    const message = `MCP init is required: endpoint '${endpoint}' publishes entities but has no init`
    for (const documentId of documents) {
      notifications.push({
        category: MESSAGE_CATEGORY.McpInitRequired,
        severity: MESSAGE_SEVERITY.Error,
        message: message,
        documentId: documentId,
      })
    }
  }
}

/**
 * Validates each published MCP document, in full, against the official schema for the protocolVersion
 * its endpoint's init declares. Validating the raw document (not the extracted entities) also rejects
 * items extraction dropped (e.g. a tool with no `name`) — so a document that yields zero entities is
 * still validated and an all-invalid list leaves every document flagged. The endpoint is read from the
 * document's `metadata.mcpEndpoint` (the authoritative source, independent of extraction) and the version
 * from the matching endpoint's init. A missing endpoint, an unsupported protocolVersion and a
 * non-conforming document are all reported against the document; the pass continues.
 */
export function validateMcpProtocolVersion(
  documents: Map<string, VersionDocument>,
  notifications: NotificationMessage[],
): void {
  const reportSchemaFailure = (document: VersionDocument, message: string): void => {
    notifications.push({
      category: MESSAGE_CATEGORY.McpDocumentSchema,
      severity: MESSAGE_SEVERITY.Error,
      message: message,
      documentId: document.slug,
    })
  }

  const versionByEndpoint = new Map<string, unknown>()
  for (const document of documents.values()) {
    if (document.publish === false) { continue }
    if (MCP_DOCUMENT_TYPE_TO_KIND[document.type] !== MCP_KIND.INIT) { continue }
    const endpoint = document.metadata?.mcpEndpoint
    if (!isString(endpoint)) { continue } // missing endpoint is reported per-document in the loop below
    // at most one init per endpoint: a second would share the init's mcpEntityId and is already
    // rejected by the cross-document duplicate check, so this set never overwrites a real version
    versionByEndpoint.set(endpoint, document.data?.originalDocument?.protocolVersion)
  }

  const alreadyFlagged = new Set(notifications
    .filter(({ category, documentId }) => category === MESSAGE_CATEGORY.McpEntityBuild && documentId)
    .map(({ documentId }) => documentId))

  for (const document of documents.values()) {
    if (document.publish === false) { continue } // not published → not validated
    const kind = MCP_DOCUMENT_TYPE_TO_KIND[document.type]
    if (!kind) { continue } // not an MCP document

    const endpoint = document.metadata?.mcpEndpoint
    if (!isString(endpoint)) {
      // `buildMcpEntities` rejects this first and in the same words, so a document it already flagged is not
      // told twice; a caller that runs this pass on its own still gets the message
      if (!alreadyFlagged.has(document.slug)) {
        reportSchemaFailure(document, `MCP file '${document.fileId}' is missing required metadata.mcpEndpoint`)
      }
      continue
    }

    const version = versionByEndpoint.get(endpoint)
    if (!isString(version) || !isSupportedMcpVersion(version)) {
      reportSchemaFailure(document,
        `MCP endpoint '${endpoint}' declares unsupported protocolVersion '${String(version)}'. ` +
        `Supported versions: ${SUPPORTED_MCP_VERSIONS.join(', ')}`,
      )
      continue
    }

    const validate = getMcpSchemaValidator(version, kind)
    if (!validate) {
      // version is supported → a missing validator is a wiring bug, not bad input
      reportSchemaFailure(document, `No MCP schema for kind '${kind}' at protocolVersion '${version}' (endpoint '${endpoint}')`)
      continue
    }
    if (!validate(document.data?.originalDocument)) {
      const detail = (validate.errors ?? [])
        .map(error => `${error.instancePath || '/'} ${error.message ?? 'does not match schema'}`.trim())
        .join('; ')
      reportSchemaFailure(document, `MCP ${document.type} document '${document.slug}' does not conform to protocolVersion '${version}': ${detail}`)
    }
  }
}

const CAPABILITY_TO_KIND: [string, McpKind][] = [
  [MCP_COLLECTION_KEY[MCP_KIND.TOOL], MCP_KIND.TOOL],
  [MCP_COLLECTION_KEY[MCP_KIND.PROMPT], MCP_KIND.PROMPT],
  [MCP_COLLECTION_KEY[MCP_KIND.RESOURCE], MCP_KIND.RESOURCE],
]

/**
 * Cross-check: for every init entity, warn if its document declares a capability (tools/prompts/resources)
 * for which no entity of the matching kind exists under the same endpoint. Derives everything from the
 * stored entities plus the init document's raw JSON, so it can run after granular incremental updates too.
 */
export function validateMcpCapabilities(
  entities: McpEntityIndex,
  documents: Map<string, VersionDocument>,
  notifications: NotificationMessage[],
): void {
  const allEntities = [...entities.values()]
  // `documents` is keyed by fileId while an entity carries the document slug, so index by slug to look up
  const documentsBySlug = new Map([...documents.values()].map(document => [document.slug, document]))
  for (const initEntity of allEntities) {
    if (initEntity.kind !== MCP_KIND.INIT) { continue }
    const initDocument = documentsBySlug.get(initEntity.documentId)
    const capabilities = initDocument?.data?.originalDocument?.capabilities
    if (!isObject(capabilities)) { continue }
    for (const [capKey, kind] of CAPABILITY_TO_KIND) {
      if (!capabilities[capKey]) { continue }
      const hasEntities = allEntities.some(e => e.mcpEndpoint === initEntity.mcpEndpoint && e.kind === kind)
      if (!hasEntities) {
        notifications.push({
          category: MESSAGE_CATEGORY.McpCapabilityUnused,
          severity: MESSAGE_SEVERITY.Warning,
          message: `MCP init declares '${capKey}' capability for endpoint '${initEntity.mcpEndpoint}', but no ${kind} entities were found`,
          documentId: initEntity.documentId,
        })
      }
    }
  }
}
