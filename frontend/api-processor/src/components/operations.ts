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

import type { ApiBuilder, ApiOperation, BuilderContext, BuildResult, VersionDocument } from '../types'
import { setReportingDuplicate } from '../utils'
import { ASYNCAPI_API_TYPE, MESSAGE_CATEGORY, MESSAGE_SEVERITY } from '../consts'
import { Claims, collectClaim, listDocuments, reportCollisions } from './duplicate-resolution'
import { NotificationMessage } from '../types/package/notifications'

/** All a collision needs to know about a claimant: who derived the id, and by which api type. */
export interface OperationClaim {
  documentId: string
  apiType: string
}

/**
 * The index key of an operation: the api type, then the id.
 *
 * Operations are discriminated by api type first, so `pets-get` derived by a REST document and by an AsyncAPI
 * one are two operations, not one. A key of the id alone lets whichever is processed second evict the other
 * from the version and turns the pair into a cross-document duplicate.
 */
export const operationKey = ({ apiType, operationId }: { apiType: string; operationId: string }): string =>
  `${apiType}:${operationId}`

/** The id back out of a key; an api type carries no colon, so the first one separates the two. */
const operationIdOf = (key: string): string => key.slice(key.indexOf(':') + 1)

/**
 * Grade every operationId two or more documents derived, reading `operationClaims` off the documents.
 *
 * Used by the editor's incremental rebuild, which has no built content of its own to collect from. A
 * publication collects the same claims from what it just built and calls `reportOperationCollisions`; both
 * key by `operationKey`, so both reach the same verdict for the same documents.
 */
export function reportOperationCollisionsOf(
  documents: Iterable<VersionDocument>,
  notifications: NotificationMessage[],
): void {
  const claims: Claims<OperationClaim> = new Map()
  for (const document of documents) {
    for (const { operationId, apiType } of document.operationClaims ?? []) {
      collectClaim(claims, operationKey({ apiType, operationId }), { documentId: document.slug, apiType })
    }
  }
  reportOperationCollisions(claims, notifications)
}

/**
 * Cross-document operationId collisions, within one api type — the claims are keyed by `operationKey`.
 *
 * Every claimant of a key shares its api type, so one of them answers for the whole collision: AsyncAPI
 * grades it an `Error`, REST and GraphQL a `Warning`.
 */
export function reportOperationCollisions(
  claims: Claims<OperationClaim>,
  notifications: NotificationMessage[],
): void {
  reportCollisions(
    claims,
    notifications,
    MESSAGE_CATEGORY.DuplicateOperationId,
    ({ apiType }) => (apiType === ASYNCAPI_API_TYPE ? MESSAGE_SEVERITY.Error : MESSAGE_SEVERITY.Warning),
    (key, documentIds) =>
      `Duplicated operationId '${operationIdOf(key)}' found in different documents: ${listDocuments(documentIds)}`,
  )
}

export async function buildDocumentOperations(
  document: VersionDocument,
  builder: ApiBuilder,
  ctx: BuilderContext,
): Promise<ApiOperation[]> {
  return builder.buildOperations ? await builder.buildOperations(document, ctx) : []
}

/**
 * Claim the document's operations in the build's index.
 *
 * Reporting collisions is not this function's job: a publication has already done it in `reportIdCollisions`,
 * and the editor's incremental rebuild does it afterwards in `reportOperationCollisionsOf`.
 */
export function indexOperations(
  document: VersionDocument,
  operations: ApiOperation[],
  buildResult: BuildResult,
): void {
  // everything this document built; `reconcileOwnedIds` prunes what another document ends up owning
  document.operationIds = operations.map(({ operationId }) => operationId)
  // kept whole: `reconcileOwnedIds`, `rebuildFiles` and `removeOutdatedCaches` look an entry up by the claim
  // that made it, and a document that lost an id still has to name it to find what it once owned
  document.operationClaims = operations.map(({ operationId, apiType }) => ({ operationId, apiType }))
  for (const operation of operations) {
    setReportingDuplicate(buildResult.operations, operationKey(operation), operation)
  }
}

/** Build and claim in one step, for the editor's incremental rebuild. */
export async function processOperationDocument(
  document: VersionDocument,
  builder: ApiBuilder,
  ctx: BuilderContext,
  buildResult: BuildResult,
): Promise<void> {
  if (!builder.buildOperations) { return }
  indexOperations(document, await buildDocumentOperations(document, builder, ctx), buildResult)
}
