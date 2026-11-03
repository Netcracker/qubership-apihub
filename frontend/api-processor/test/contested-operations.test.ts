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

import { describe, expect, test } from '@jest/globals'
import { Diff } from '@netcracker/qubership-apihub-api-diff'
import { OpenAPIV3 } from 'openapi-types'
import {
  ContestedDocumentPair,
  ContestedOperationsCompare,
  describeConflict,
  DocumentClaim,
  findContestedOperationConflicts,
  OperationConflict,
} from '../src/components/contested-operations'
import { Claims, collectClaim } from '../src/components/duplicate-resolution'
import { APIHUB_API_COMPATIBILITY_KIND_BWC, APIHUB_API_COMPATIBILITY_KIND_NO_BWC } from '../src/consts'
import { API_AUDIENCE_EXTERNAL, API_AUDIENCE_INTERNAL, OperationId, VersionDocument } from '../src/types'
import { restOperation, RestOperationOverrides, versionDocument } from './helpers/factories'

/*
 * The comparison of documents is a parameter, so these cases state the engine's own behavior with a stub: how the
 * content verdict and the metadata verdict combine, per contested id, and how often a pair is compared.
 */

const SPEC_2 = 'spec2'
const SPEC_3 = 'spec3'
const OPERATION_ID = 'alpha-get'

const EXTERNAL: RestOperationOverrides = { apiAudience: API_AUDIENCE_EXTERNAL }
const INTERNAL: RestOperationOverrides = { apiAudience: API_AUDIENCE_INTERNAL }
const BWC: RestOperationOverrides = { apiKind: APIHUB_API_COMPATIBILITY_KIND_BWC }
const NO_BWC: RestOperationOverrides = { apiKind: APIHUB_API_COMPATIBILITY_KIND_NO_BWC }

type ExpectedConflict = Omit<OperationConflict, 'operationId'>

const claimOn = (
  document: VersionDocument,
  operationId: string,
  overrides: RestOperationOverrides = {},
): DocumentClaim => ({
  document,
  documentId: document.slug,
  operation: restOperation({ operationId, documentId: document.slug, ...overrides }),
})

/** One document's claim on `alpha-get`, disagreeing on whatever the overrides set. */
const claimOf = (slug: string, overrides: RestOperationOverrides = {}): DocumentClaim =>
  claimOn(versionDocument(slug), OPERATION_ID, overrides)

const claimsOf = (...claimants: DocumentClaim[]): Claims<DocumentClaim> => {
  const claims: Claims<DocumentClaim> = new Map()
  claimants.forEach(claimant => collectClaim(claims, OPERATION_ID, claimant))
  return claims
}

/** Claims of `spec1`, `spec2`, and so on, one per overrides entry, in that order. */
const claimsOfSpecs = (overrides: RestOperationOverrides[]): Claims<DocumentClaim> =>
  claimsOf(...overrides.map((override, index) => claimOf(`spec${index + 1}`, override)))

/** A second operation of the same document under `alpha-get`, the way a slug twin of `/alpha` derives it. */
const secondClaimOf = (claim: DocumentClaim, overrides: RestOperationOverrides = {}): DocumentClaim =>
  claimOn(claim.document, OPERATION_ID, {
    ...overrides,
    metadata: { originalPath: '/alpha-twin', method: OpenAPIV3.HttpMethods.GET },
  })

const conflictsOn = (expected: ExpectedConflict[]): OperationConflict[] =>
  expected.map(conflict => ({ operationId: OPERATION_ID, ...conflict }))

// the engine reads only whether a diff exists
const ANY_DIFF = {} as Diff

/** A comparison that finds a difference when the other document of a pair is one of the named ones. */
const compareFindingDiffsIn = (...differingSlugs: string[]): ContestedOperationsCompare => pair =>
  new Map<OperationId, Diff[]>(
    pair.operations.map((
      { operationId },
    ) => [operationId, differingSlugs.includes(pair.otherDocument.slug) ? [ANY_DIFF] : []]),
  )

/** A comparison that finds nothing and counts how often it was asked. */
const countingComparison = (): ContestedOperationsCompare & { calls: number } => {
  const compare = (pair: ContestedDocumentPair): Map<OperationId, Diff[]> => {
    compare.calls += 1
    return new Map(pair.operations.map(({ operationId }) => [operationId, []]))
  }
  compare.calls = 0
  return compare
}

describe('findContestedOperationConflicts', () => {
  test.each([
    ['describe the same operation', [{}, {}], compareFindingDiffsIn(), []],
    ['differ only in metadata', [EXTERNAL, INTERNAL], compareFindingDiffsIn(), [{
      contentDiffers: false,
      differingFields: ['apiAudience'],
    }]],
    ['differ only in content', [{}, {}], compareFindingDiffsIn(SPEC_2), [{
      contentDiffers: true,
      differingFields: [],
    }]],
    ['differ in content and metadata', [BWC, NO_BWC], compareFindingDiffsIn(SPEC_2), [{
      contentDiffers: true,
      differingFields: ['apiKind'],
    }]],
    // an id the comparison left out is a conflict rather than agreement
    ['are left out by the comparison', [{}, {}], () => new Map(), [{ contentDiffers: true, differingFields: [] }]],
  ] as Array<[string, RestOperationOverrides[], ContestedOperationsCompare, ExpectedConflict[]]>)(
    'should report what differs when two documents %s',
    (_case, overrides, compare, expected) => {
      expect(findContestedOperationConflicts(claimsOfSpecs(overrides), compare)).toEqual(conflictsOn(expected))
    },
  )

  // every later claim is compared with the first, and what one pair found is never overwritten by a later pair
  test.each([
    ['only the third differs in content', [{}, {}, {}], compareFindingDiffsIn(SPEC_3), [{
      contentDiffers: true,
      differingFields: [],
    }]],
    ['the second differs in content and the third in metadata', [{}, {}, INTERNAL], compareFindingDiffsIn(SPEC_2), [{
      contentDiffers: true,
      differingFields: ['apiAudience'],
    }]],
    ['the second differs in metadata and the third in content', [{}, INTERNAL, {}], compareFindingDiffsIn(SPEC_3), [{
      contentDiffers: true,
      differingFields: ['apiAudience'],
    }]],
    // the fields come out in the compared order, not in the order the claims were found in
    ['the second and the third disagree on different fields', [{}, INTERNAL, NO_BWC], compareFindingDiffsIn(), [{
      contentDiffers: false,
      differingFields: ['apiKind', 'apiAudience'],
    }]],
  ] as Array<[string, RestOperationOverrides[], ContestedOperationsCompare, ExpectedConflict[]]>)(
    'should gather what differs when three documents claim the id and %s',
    (_case, overrides, compare, expected) => {
      expect(findContestedOperationConflicts(claimsOfSpecs(overrides), compare)).toEqual(conflictsOn(expected))
    },
  )

  // one comparison answers for the whole pair, so each id must be read from its own entry, not from the pair
  test('should answer for each contested id of a pair on its own evidence', () => {
    const [first, second] = ['spec1', SPEC_2].map(slug => versionDocument(slug))
    const claims: Claims<DocumentClaim> = new Map()
    collectClaim(claims, OPERATION_ID, claimOn(first, OPERATION_ID, EXTERNAL))
    collectClaim(claims, OPERATION_ID, claimOn(second, OPERATION_ID, INTERNAL))
    collectClaim(claims, 'beta-get', claimOn(first, 'beta-get'))
    collectClaim(claims, 'beta-get', claimOn(second, 'beta-get'))

    const conflicts = findContestedOperationConflicts(
      claims,
      pair =>
        new Map<OperationId, Diff[]>(
          pair.operations.map(({ operationId }) => [operationId, operationId === 'beta-get' ? [ANY_DIFF] : []]),
        ),
    )

    expect(conflicts).toEqual([
      { operationId: OPERATION_ID, contentDiffers: false, differingFields: ['apiAudience'] },
      { operationId: 'beta-get', contentDiffers: true, differingFields: [] },
    ])
  })

  // `/res/data` and `/res-data` both derive one id, so one document can hold two claims on it
  describe('a document claiming the id twice', () => {
    test('should compare both of its claims and name each field once', () => {
      const claimingTwice = claimOf(SPEC_2, INTERNAL)
      const conflicts = findContestedOperationConflicts(
        claimsOf(claimOf('spec1'), claimingTwice, secondClaimOf(claimingTwice, { ...INTERNAL, ...NO_BWC })),
        compareFindingDiffsIn(),
      )

      expect(conflicts).toEqual(conflictsOn([{ contentDiffers: false, differingFields: ['apiKind', 'apiAudience'] }]))
    })

    test('should not compare it with itself', () => {
      const claim = claimOf('spec1')
      const comparison = countingComparison()

      expect(findContestedOperationConflicts(claimsOf(claim, secondClaimOf(claim, NO_BWC)), comparison)).toEqual([])
      expect(comparison.calls).toBe(0)
    })
  })

  test('should compare each document pair once, whatever the number of contested ids', () => {
    const documents = ['spec1', SPEC_2, SPEC_3].map(slug => versionDocument(slug))
    const claims: Claims<DocumentClaim> = new Map()
    for (let index = 0; index < 12; index++) {
      const operationId = `res${index}-get`
      documents.forEach(document => collectClaim(claims, operationId, claimOn(document, operationId)))
    }
    const comparison = countingComparison()

    findContestedOperationConflicts(claims, comparison)

    // every later document is compared with the first: two pairs
    expect(comparison.calls).toBe(2)
  })
})

describe('describeConflict', () => {
  test.each([
    [{ contentDiffers: true, differingFields: [] }, 'The documents describe the operation differently.'],
    [
      { contentDiffers: false, differingFields: ['apiKind', 'apiAudience'] },
      'The documents disagree on apiKind and apiAudience.',
    ],
    [
      { contentDiffers: true, differingFields: ['apiKind'] },
      'The documents describe the operation differently and disagree on apiKind.',
    ],
  ] as Array<[ExpectedConflict, string]>)('should describe %j', (conflict, expected) => {
    expect(describeConflict({ operationId: OPERATION_ID, ...conflict })).toBe(expected)
  })
})
