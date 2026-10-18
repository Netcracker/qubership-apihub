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

import {
  ApiOperation,
  BuildFileResult,
  BuilderContext,
  BuildResult,
  DdlEntity,
  McpEntity,
  VersionDocument,
} from '../types'
import { DDL_CONTRACT_TYPE, MCP_CONTRACT_TYPE, MESSAGE_CATEGORY, MESSAGE_SEVERITY } from '../consts'
import { MessageCategory } from '../types/package/notifications'
import { ParsedDdlData, validateDdlDocument } from '../apitypes/ddl'
import { buildDocumentDdlEntities, indexDdlEntities, reportDdlCollisions } from './ddl'
import { buildDocumentOperations, indexOperations, OperationClaim, operationKey, reportOperationCollisions } from './operations'
import {
  buildDocumentMcpEntities,
  indexMcpEntities,
  McpClaim,
  reportMcpCollisions,
  validateMcpCapabilities,
  validateMcpInitRequired,
  validateMcpProtocolVersion,
} from './mcp'
import { Claims, collectClaim } from './duplicate-resolution'

interface DocumentContent {
  document: VersionDocument
  operations?: ApiOperation[]
  mcpEntities?: McpEntity[]
  ddlEntities?: DdlEntity[]
}

/**
 * Build every document of the version. Nothing is claimed here — see `indexBuiltIds`.
 *
 * A document already carrying an `Error` is built like any other; the flag does not stop it producing
 * operations or entities. A failure is recorded against the document that raised it, and the loop continues
 * with the next document.
 */
async function buildAllDocuments(
  files: BuildFileResult[],
  ctx: BuilderContext,
  buildResult: BuildResult,
): Promise<DocumentContent[]> {
  const built: DocumentContent[] = []

  for (const { file, document, builder } of files) {
    buildResult.documents.set(document.fileId, document)
    if (!builder || document.publish === false) { continue }

    try {
      if (builder.apiType === MCP_CONTRACT_TYPE) {
        built.push({ document, mcpEntities: buildDocumentMcpEntities(file, document, builder, buildResult.notifications) })
      } else if (builder.apiType === DDL_CONTRACT_TYPE) {
        // before the entities, so the parse issues are attributed whatever the entity build does next
        validateDdlDocument(document as VersionDocument<ParsedDdlData>, buildResult.notifications)
        built.push({ document, ddlEntities: buildDocumentDdlEntities(file, document, builder, buildResult.notifications) })
      } else {
        built.push({ document, operations: await buildDocumentOperations(document, builder, ctx) })
      }
    } catch (error) {
      buildResult.notifications.push({
        category: categoryOfDocumentProcessing(builder.apiType),
        severity: MESSAGE_SEVERITY.Error,
        message: error instanceof Error ? error.message : `Cannot process document '${document.slug}'`,
        documentId: document.slug,
      })
    }
  }

  return built
}

/**
 * Report every id two or more documents claimed.
 *
 * Runs before anything is indexed: one message names every document that claimed the id, so they all have to
 * be collected before any of them is reported.
 */
function reportIdCollisions(built: DocumentContent[], buildResult: BuildResult): void {
  const operationClaims: Claims<OperationClaim> = new Map()
  const mcpClaims: Claims<McpClaim> = new Map()
  const ddlClaims: Claims<DdlEntity> = new Map()
  for (const { document, operations, mcpEntities, ddlEntities } of built) {
    for (const { operationId, apiType } of operations ?? []) {
      collectClaim(operationClaims, operationKey({ apiType, operationId }), { documentId: document.slug, apiType })
    }
    for (const { mcpEntityId } of mcpEntities ?? []) {
      collectClaim(mcpClaims, mcpEntityId, { documentId: document.slug })
    }
    for (const entity of ddlEntities ?? []) { collectClaim(ddlClaims, entity.ddlEntityId, entity) }
  }

  reportOperationCollisions(operationClaims, buildResult.notifications)
  reportMcpCollisions(mcpClaims, buildResult.notifications)
  reportDdlCollisions(ddlClaims, buildResult.notifications)
}

/**
 * Give every built id its owner.
 *
 * A contested id goes to the lexicographically smallest slug (`setReportingDuplicate`), and
 * `reconcileOwnedIds` then drops it from the documents that lost. An `Error` on a document does not change
 * what it indexes.
 */
function indexBuiltIds(built: DocumentContent[], buildResult: BuildResult): void {
  for (const { document, operations, mcpEntities, ddlEntities } of built) {
    if (operations) { indexOperations(document, operations, buildResult) }
    if (mcpEntities) { indexMcpEntities(document, mcpEntities, buildResult) }
    if (ddlEntities) { indexDdlEntities(ddlEntities, buildResult) }
  }

  // ownership is final only now: prune the ids another document won before anything reads them
  reconcileOwnedIds(buildResult.documents.values(), buildResult.operations, buildResult.mcpEntities)
}

/** Everything the version publishes from its own documents: built, graded against each other, indexed. */
export async function buildVersionContent(
  files: BuildFileResult[],
  ctx: BuilderContext,
  buildResult: BuildResult,
): Promise<void> {
  const built = await buildAllDocuments(files, ctx, buildResult)
  reportIdCollisions(built, buildResult)
  indexBuiltIds(built, buildResult)

  // whole-set cross-checks: they need every entity the version's documents built, which is what the index
  // holds — an init and its tools may live in different files
  validateMcpProtocolVersion(buildResult.documents, buildResult.notifications)
  validateMcpInitRequired(buildResult.mcpEntities, buildResult.notifications)
  validateMcpCapabilities(buildResult.mcpEntities, buildResult.documents, buildResult.notifications)
}

const categoryOfDocumentProcessing = (apiType: string): MessageCategory => {
  switch (apiType) {
    case MCP_CONTRACT_TYPE: return MESSAGE_CATEGORY.McpEntityBuild
    case DDL_CONTRACT_TYPE: return MESSAGE_CATEGORY.DdlEntityBuild
    default: return MESSAGE_CATEGORY.BuildOperations
  }
}

/** Of the ids the document claimed, the ones the index still attributes to it. */
const keepOwned = (
  claimed: Array<[key: string, id: string]>,
  slug: string,
  index: Map<string, { documentId: string }>,
): string[] => {
  const owned = new Set<string>()
  for (const [key, id] of claimed) {
    if (index.get(key)?.documentId === slug) { owned.add(id) }
  }
  return [...owned]
}

/**
 * Drop from every document the ids another document won, and collapse repeats.
 *
 * Ownership is not final while the loop runs: a smaller slug arriving later takes the entry
 * (`setReportingDuplicate`), so a document that owned an id when it was processed may not own it at the end.
 * Without this pass `documents.json` announces ids that `operations.json` attributes elsewhere.
 */
export function reconcileOwnedIds(
  documents: Iterable<VersionDocument>,
  operations: Map<string, { documentId: string }>,
  mcpEntities: Map<string, { documentId: string }>,
): void {
  for (const document of documents) {
    // the operation index is keyed per api type, so ownership is looked up by the claim, not by the bare id
    document.operationIds = keepOwned(
      (document.operationClaims ?? []).map(claim => [operationKey(claim), claim.operationId]),
      document.slug, operations)
    if (document.mcpEntityIds) {
      document.mcpEntityIds = keepOwned(
        document.mcpEntityIds.map(id => [id, id]), document.slug, mcpEntities)
    }
  }
}
