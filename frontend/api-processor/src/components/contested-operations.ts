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

import { Diff } from '@netcracker/qubership-apihub-api-diff'
import { ComparedOperationFields, OperationClaim, OperationId, VersionDocument } from '../types'
import { isEmpty, isNotEmpty } from '../utils'
import { Claims } from './duplicate-resolution'

// a collision is one operationId claimed by two or more documents of a version, and that id is contested; a
// conflict is a collision whose documents do not describe the operation the same way

export type ComparedField = keyof ComparedOperationFields

/** The compared fields in message order; a `Record`, so a new `ComparedOperationFields` field has to be listed. */
const COMPARED_FIELD_SET: Record<ComparedField, true> = { apiKind: true, apiAudience: true }
const COMPARED_FIELDS = Object.keys(COMPARED_FIELD_SET) as ComparedField[]

/** One document's claim on an operationId. */
export interface DocumentClaim {
  document: VersionDocument
  /** The document's slug, the name a collision message uses. */
  documentId: string
  operation: OperationClaim
}

/** One contested id inside a document pair, as each of the two documents derived it. */
export interface ContestedOperation {
  operationId: OperationId
  anchorOperation: OperationClaim
  otherOperation: OperationClaim
}

/** Two documents one comparison answers for, with every id they contest. */
export interface ContestedDocumentPair {
  anchorDocument: VersionDocument
  otherDocument: VersionDocument
  operations: ContestedOperation[]
}

/**
 * How an api type compares a pair: the diffs per contested id, empty where the documents agree. An id it could not
 * compare is left out and counts as a difference.
 */
export type ContestedOperationsCompare = (pair: ContestedDocumentPair) => Map<OperationId, Diff[]>

/** A contested id whose documents disagree, and what they disagree on. */
export interface OperationConflict {
  operationId: OperationId
  /** Whether the comparison of the documents attributes a diff to the operation, or could not compare it. */
  contentDiffers: boolean
  /** The compared fields any claim disagrees on with the first claim, in `COMPARED_FIELDS` order. */
  differingFields: ComparedField[]
}

/**
 * Find the contested ids whose documents disagree; an empty result means there is nothing to report.
 *
 * Every claim is compared with the first claim of its id, so a conflict says that the documents disagree, not
 * which of them.
 */
export function findContestedOperationConflicts(
  claims: Claims<DocumentClaim>,
  compareContestedOperations: ContestedOperationsCompare,
): OperationConflict[] {
  const disagreementsByOperationId = new Map<
    OperationId,
    { contentDiffers: boolean; differingFields: Set<ComparedField> }
  >()

  for (const pair of pairContestedDocuments(claims)) {
    // one comparison per pair, not per contested id
    const diffsByOperationId = compareContestedOperations(pair)

    for (const { operationId, anchorOperation, otherOperation } of pair.operations) {
      const differingFieldsInPair = findDifferingFields(anchorOperation, otherOperation)
      const diffsInPair = diffsByOperationId.get(operationId)
      // an id the comparison left out counts as a difference, never as agreement
      const contentDiffersInPair = diffsInPair === undefined || isNotEmpty(diffsInPair)
      if (isEmpty(differingFieldsInPair) && !contentDiffersInPair) continue

      // a later pair adds to what earlier pairs recorded
      const disagreement = disagreementsByOperationId.get(operationId) ??
        { contentDiffers: false, differingFields: new Set<ComparedField>() }
      disagreement.contentDiffers = disagreement.contentDiffers || contentDiffersInPair
      differingFieldsInPair.forEach(field => disagreement.differingFields.add(field))
      disagreementsByOperationId.set(operationId, disagreement)
    }
  }

  return [...disagreementsByOperationId].map(([operationId, { contentDiffers, differingFields }]) => ({
    operationId,
    contentDiffers,
    differingFields: COMPARED_FIELDS.filter(field => differingFields.has(field)),
  }))
}

/** Describe what separates the documents of a conflict, never which document differs. */
export function describeConflict({ contentDiffers, differingFields }: OperationConflict): string {
  const reasons = [
    ...(contentDiffers ? ['describe the operation differently'] : []),
    ...(isEmpty(differingFields) ? [] : [`disagree on ${differingFields.join(' and ')}`]),
  ]
  return `The documents ${reasons.join(' and ')}.`
}

/**
 * Group the contested ids into document pairs, so one comparison answers for every id two documents share.
 *
 * The first claim of an id anchors its pairs, so `claims` must list claimants in build order. A document that
 * claims one id twice is an intra-document duplicate with a report of its own, and is never paired with itself.
 */
function pairContestedDocuments(claims: Claims<DocumentClaim>): ContestedDocumentPair[] {
  const pairsByAnchorDocument = new Map<VersionDocument, Map<VersionDocument, ContestedDocumentPair>>()
  const pairs: ContestedDocumentPair[] = []

  for (const [anchorClaim, ...otherClaims] of claims.values()) {
    let pairsByOtherDocument = pairsByAnchorDocument.get(anchorClaim.document)
    if (!pairsByOtherDocument) {
      pairsByOtherDocument = new Map()
      pairsByAnchorDocument.set(anchorClaim.document, pairsByOtherDocument)
    }

    for (const otherClaim of otherClaims) {
      if (otherClaim.document === anchorClaim.document) continue

      let pair = pairsByOtherDocument.get(otherClaim.document)
      if (!pair) {
        pair = { anchorDocument: anchorClaim.document, otherDocument: otherClaim.document, operations: [] }
        pairsByOtherDocument.set(otherClaim.document, pair)
        pairs.push(pair)
      }

      pair.operations.push({
        operationId: anchorClaim.operation.operationId,
        anchorOperation: anchorClaim.operation,
        otherOperation: otherClaim.operation,
      })
    }
  }

  return pairs
}

/** List the compared fields two operations disagree on; {@link ComparedOperationFields} says why only these. */
function findDifferingFields(
  firstOperation: ComparedOperationFields,
  secondOperation: ComparedOperationFields,
): ComparedField[] {
  return COMPARED_FIELDS.filter(field => firstOperation[field] !== secondOperation[field])
}
