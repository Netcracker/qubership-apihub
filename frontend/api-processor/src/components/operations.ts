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

import type {
  ApiBuilder,
  ApiOperation,
  BuilderContext,
  BuildResult,
  OperationClaim,
  VersionDocument,
} from '../types'
import { setReportingDuplicate } from '../utils'
import { ASYNCAPI_API_TYPE, MESSAGE_CATEGORY, MESSAGE_SEVERITY } from '../consts'
import { Claims, collectClaim, listDocuments, reportCollisions } from './duplicate-resolution'
import { NotificationMessage } from '../types/package/notifications'
import {
  ContestedOperationsCompare,
  describeConflict,
  DocumentClaim,
  findContestedOperationConflicts,
} from './contested-operations'

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
 * Record that `document` derived `operation`. A publication and the editor's rebuild both collect through here,
 * so both reach `reportOperationCollisions` with the same claims.
 */
export function collectOperationClaim(
  claims: Claims<DocumentClaim>,
  document: VersionDocument,
  operation: OperationClaim,
): void {
  collectClaim(claims, operationKey(operation), { document, documentId: document.slug, operation })
}

/** Reduce an operation to what its document keeps once the operation itself is gone. */
export const toOperationClaim = (
  { operationId, apiType, apiKind, apiAudience }: ApiOperation,
): OperationClaim => ({ operationId, apiType, apiKind, apiAudience })

/**
 * Report the operationIds two or more documents of a version derived, one message per document. Claims are keyed
 * by `operationKey`, so a collision never crosses api types.
 *
 * An api type whose builder declares `compareContestedOperations` reports only a conflict, as an `Error`: documents
 * that describe an id identically publish one operation either way. Any other api type reports every collision,
 * as an `Error` for AsyncAPI and a `Warning` otherwise. A reported id names every claimant, even when only one of
 * them disagrees.
 */
export function reportOperationCollisions(
  claims: Claims<DocumentClaim>,
  notifications: NotificationMessage[],
  apiBuilders: ApiBuilder[],
): void {
  const comparisons = new Map<string, ContestedOperationsCompare>()
  for (const { apiType, compareContestedOperations } of apiBuilders) {
    if (compareContestedOperations) { comparisons.set(apiType, compareContestedOperations) }
  }

  // every claimant of a key shares its api type
  const apiTypeOf = (claimants: DocumentClaim[]): string => claimants[0].operation.apiType

  // what differs, by the key of every contested id whose documents disagree
  const conflictDescriptions = new Map<string, string>()
  for (const [apiType, compare] of comparisons) {
    const claimsOfApiType = new Map([...claims].filter(([, claimants]) => apiTypeOf(claimants) === apiType))
    const operationConflicts = findContestedOperationConflicts(claimsOfApiType, compare)
    for (const conflict of operationConflicts) {
      conflictDescriptions.set(operationKey({ apiType, operationId: conflict.operationId }), describeConflict(conflict))
    }
  }

  const isReported = ([key, claimants]: [string, DocumentClaim[]]): boolean =>
    !comparisons.has(apiTypeOf(claimants)) || conflictDescriptions.has(key)

  reportCollisions(
    new Map([...claims].filter(isReported)),
    notifications,
    MESSAGE_CATEGORY.DuplicateOperationId,
    ({ operation: { apiType } }) =>
      (comparisons.has(apiType) || apiType === ASYNCAPI_API_TYPE ? MESSAGE_SEVERITY.Error : MESSAGE_SEVERITY.Warning),
    (key, documentIds) => {
      const collisionMessage = `Duplicated operationId '${operationIdOf(key)}' found in different documents: ${listDocuments(documentIds)}`
      const conflictDescription = conflictDescriptions.get(key)
      return conflictDescription ? `${collisionMessage}. ${conflictDescription}` : collisionMessage
    },
  )
}

/**
 * Report operationId collisions from the claims the documents remember, for the editor's rebuild: the index keeps
 * only the winner of each id, so what a document remembers is the only claim left.
 */
export function reportOperationCollisionsOf(
  documents: Iterable<VersionDocument>,
  notifications: NotificationMessage[],
  apiBuilders: ApiBuilder[],
): void {
  const claims: Claims<DocumentClaim> = new Map()
  for (const document of documents) {
    for (const operation of document.operationClaims ?? []) {
      collectOperationClaim(claims, document, operation)
    }
  }
  reportOperationCollisions(claims, notifications, apiBuilders)
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
  document.operationClaims = operations.map(toOperationClaim)
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
