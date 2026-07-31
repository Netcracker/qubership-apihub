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
  McpEntityId,
  McpEntityIndex,
  McpKind,
  PackageMcpFile,
} from '../types/package/mcp'
import { NotificationMessage } from '../types/package'
import { MCP_DOCUMENT_TYPE } from '../apitypes/mcp'
import { DuplicateHandler, isObject, isString, setReportingDuplicate } from '../utils'
import { MESSAGE_SEVERITY } from '../consts'
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

export type DuplicateMcpEntityHandler = DuplicateHandler<McpEntity>

export const createDuplicateMcpEntityHandler = (): DuplicateMcpEntityHandler => (existing, duplicate) => {
  // the same document re-processed (e.g. incremental rebuild) is not a cross-document duplicate
  if (existing.documentId === duplicate.documentId) { return }
  throw new Error(
    `Duplicate MCP entity ID '${duplicate.mcpEntityId}' found in different documents: '${existing.documentId}' and '${duplicate.documentId}'`,
  )
}

export function processMcpDocument(
  file: BuildConfigFile,
  document: VersionDocument,
  builder: ApiBuilder,
  ctx: McpBuildContext,
  onDuplicate?: DuplicateMcpEntityHandler,
): void {
  if (!builder.buildMcpEntities) { return }
  const entities: McpEntity[] = builder.buildMcpEntities(document, file)
  const entityIds: McpEntityId[] = []
  for (const entity of entities) {
    setReportingDuplicate(ctx.mcpEntities, entity.mcpEntityId, entity, onDuplicate)
    entityIds.push(entity.mcpEntityId)
  }
  // record which entities this document owns, so an incremental update can drop them granularly
  document.mcpEntityIds = entityIds
}

export const KIND_TO_FIELD: Record<McpKind, keyof PackageMcpFile> = {
  [MCP_KIND.INIT]: 'inits',
  [MCP_KIND.TOOL]: 'tools',
  [MCP_KIND.RESOURCE]: 'resources',
  [MCP_KIND.PROMPT]: 'prompts',
}

/** Group the flat entity index into the `{ inits, tools, resources, prompts }` shape written to `mcp.json`. */
export function groupMcpEntitiesByKind(entities: McpEntityIndex): PackageMcpFile {
  const grouped: PackageMcpFile = { inits: [], tools: [], resources: [], prompts: [] }
  for (const { data: _data, ...index } of entities.values()) {
    // strip the payload (`data`) — mcp.json is the lightweight index; payloads live in mcp/{id}
    grouped[KIND_TO_FIELD[index.kind]].push(index)
  }
  return grouped
}

/**
 * Requires an init for every published endpoint. A version may publish documents for several endpoints
 * at once, and each endpoint's init is its mandatory descriptor; an endpoint that publishes any entity
 * without an init fails the publish.
 */
export function validateMcpInitRequired(entities: McpEntityIndex): void {
  const endpoints = new Set<string>()
  const endpointsWithInit = new Set<string>()
  for (const entity of entities.values()) {
    endpoints.add(entity.mcpEndpoint)
    if (entity.kind === MCP_KIND.INIT) { endpointsWithInit.add(entity.mcpEndpoint) }
  }
  for (const endpoint of endpoints) {
    if (!endpointsWithInit.has(endpoint)) {
      throw new Error(`MCP init is required: endpoint '${endpoint}' publishes entities but has no init`)
    }
  }
}

/**
 * Validates each published MCP document, in full, against the official schema for the protocolVersion
 * its endpoint's init declares. Validating the raw document (not the extracted entities) also rejects
 * items extraction dropped (e.g. a tool with no `name`) — so a document that yields zero entities is
 * still validated and an all-invalid list breaks the publish. The endpoint is read from the document's
 * `metadata.mcpEndpoint` (the authoritative source, independent of extraction) and the version from the
 * matching endpoint's init. Fatal: a missing endpoint, an unsupported protocolVersion, or any
 * non-conforming document fails the publish.
 */
export function validateMcpProtocolVersion(documents: Map<string, VersionDocument>): void {
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

  for (const document of documents.values()) {
    if (document.publish === false) { continue } // not published → not validated
    const kind = MCP_DOCUMENT_TYPE_TO_KIND[document.type]
    if (!kind) { continue } // not an MCP document

    const endpoint = document.metadata?.mcpEndpoint
    if (!isString(endpoint)) {
      // buildMcpEntities normally rejects this first; kept as a defensive guard for the whole-set pass
      throw new Error(`MCP file '${document.fileId}' is missing required metadata.mcpEndpoint`)
    }

    const version = versionByEndpoint.get(endpoint)
    if (!isString(version) || !isSupportedMcpVersion(version)) {
      throw new Error(
        `MCP endpoint '${endpoint}' declares unsupported protocolVersion '${String(version)}'. ` +
        `Supported versions: ${SUPPORTED_MCP_VERSIONS.join(', ')}`,
      )
    }

    const validate = getMcpSchemaValidator(version, kind)
    if (!validate) {
      // version is supported → a missing validator is a wiring bug, not bad input
      throw new Error(`No MCP schema for kind '${kind}' at protocolVersion '${version}' (endpoint '${endpoint}')`)
    }
    if (!validate(document.data?.originalDocument)) {
      const detail = (validate.errors ?? [])
        .map(error => `${error.instancePath || '/'} ${error.message ?? 'does not match schema'}`.trim())
        .join('; ')
      throw new Error(`MCP ${document.type} file '${document.fileId}' does not conform to protocolVersion '${version}': ${detail}`)
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
  for (const initEntity of allEntities) {
    if (initEntity.kind !== MCP_KIND.INIT) { continue }
    const initDocument = documents.get(initEntity.documentId)
    const capabilities = initDocument?.data?.originalDocument?.capabilities
    if (!isObject(capabilities)) { continue }
    for (const [capKey, kind] of CAPABILITY_TO_KIND) {
      if (!capabilities[capKey]) { continue }
      const hasEntities = allEntities.some(e => e.mcpEndpoint === initEntity.mcpEndpoint && e.kind === kind)
      if (!hasEntities) {
        notifications.push({
          severity: MESSAGE_SEVERITY.Warning,
          message: `MCP init declares '${capKey}' capability for endpoint '${initEntity.mcpEndpoint}', but no ${kind} entities were found`,
          fileId: initEntity.documentId,
        })
      }
    }
  }
}
