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

import { MCP_COLLECTION_KEY, MCP_KIND, McpEntitiesBuilder, McpKind } from '../../types'
import { ParsedMcpData } from './mcp.types'
import { isString, removeFirstSlash, SLUG_OPTIONS_OPERATION_ID, slugify } from '../../utils'

// the init entity has no per-item title; it is shown as a fixed "Overview" label (kept as "init" in data)
const INIT_ENTITY_TITLE = 'init'

export function calculateMcpEntityId(
  mcpEndpoint: string,
  kind: string,
  name: string,
): string {
  // strip the leading slash of the endpoint path the same way operation IDs do
  const safeEndpoint = slugify(removeFirstSlash(mcpEndpoint), SLUG_OPTIONS_OPERATION_ID)
  const safeName = slugify(name, SLUG_OPTIONS_OPERATION_ID)
  return `${safeEndpoint}-${kind}-${safeName}`
}

export function wrapEntityData(kind: McpKind, data: Record<string, unknown>): Record<string, unknown> {
  if (kind === MCP_KIND.INIT) { return data }
  return { [MCP_COLLECTION_KEY[kind]]: [data] }
}

export const buildMcpEntities: McpEntitiesBuilder<ParsedMcpData> = (document, file) => {
  // metadata.mcpEndpoint is required for every MCP file, independent of how many entities it yields —
  // check it before the no-entities early return so a zero-entity document cannot slip through without it
  const mcpEndpoint = file.metadata?.mcpEndpoint
  if (!isString(mcpEndpoint)) {
    throw new Error(`MCP file '${file.fileId}' is missing required metadata.mcpEndpoint`)
  }

  const { data } = document
  if (!data?.entities) { return [] }

  const documentId = document.fileId
  // intra-document duplicate detection, mirroring `operationIdMap` in rest/async.operations.
  // TODO: unify with the shared `findDuplicates`/`createDuplicatesError` once those are de-coupled from
  // operation-specific naming (`DuplicateEntry.operationId`, "Duplicated operationIds found") so the MCP
  // message stays correct. Until then we keep this MCP-specific check (id -> name, for the error text).
  const mcpEntityIdMap = new Map<string, string>()

  return data.entities.map((entity) => {
    const mcpEntityId = calculateMcpEntityId(mcpEndpoint, entity.kind, entity.name)

    if (mcpEntityIdMap.has(mcpEntityId)) {
      throw new Error(
        `Duplicate MCP entity ID '${mcpEntityId}': '${entity.name}' conflicts with '${mcpEntityIdMap.get(mcpEntityId)}' in file '${file.fileId}'`,
      )
    }
    mcpEntityIdMap.set(mcpEntityId, entity.name)

    const isInitEntity = entity.kind === MCP_KIND.INIT
    const rawTitle = entity.data.title
    const title = isInitEntity
      ? INIT_ENTITY_TITLE
      : (isString(rawTitle) ? rawTitle : entity.name)
    const description = isInitEntity ? '' : (entity.description ?? '')

    return {
      mcpEntityId,
      kind: entity.kind,
      title,
      description,
      mcpEndpoint,
      search: { useEntityDataAsSearchText: true },
      documentId,
      data: wrapEntityData(entity.kind, entity.data),
    }
  })
}
