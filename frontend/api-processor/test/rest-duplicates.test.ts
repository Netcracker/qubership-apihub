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
import { parse } from 'yaml'
import { compareContestedOperations } from '../src/apitypes/rest/rest.duplicates'
import {
  ContestedDocumentPair,
  DocumentClaim,
  findContestedOperationConflicts,
} from '../src/components/contested-operations'
import { Claims, collectClaim } from '../src/components/duplicate-resolution'
import { VersionDocument } from '../src/types'
import { restOperation, restSpec, RestSpecOptions, versionDocument } from './helpers/factories'

const ANCHOR_SLUG = 'spec1'
const OTHER_SLUG = 'spec2'

const servedUnder = (basePath: string): RestSpecOptions => ({ root: `servers: [{ url: 'https://host${basePath}' }]\n` })

const documentOf = (slug: string, yaml: string): VersionDocument =>
  versionDocument(slug, { data: parse(yaml) as OpenAPIV3.Document })

/** The comparison reads only the contested ids off the operations, so the operations carry nothing else. */
const pairOf = (anchorYaml: string, otherYaml: string, operationIds: string[]): ContestedDocumentPair => ({
  anchorDocument: documentOf(ANCHOR_SLUG, anchorYaml),
  otherDocument: documentOf(OTHER_SLUG, otherYaml),
  operations: operationIds.map(operationId => ({
    operationId,
    anchorOperation: restOperation({ operationId }),
    otherOperation: restOperation({ operationId }),
  })),
})

const diffCountsOf = (diffsByOperationId: Map<string, Diff[]>): Array<[string, number]> =>
  [...diffsByOperationId].map(([operationId, diffs]) => [operationId, diffs.length])

const actionsOf = (diffs: Diff[] = []): string[] => diffs.map(({ action }) => action)

describe('compareContestedOperations', () => {
  test.each([
    ['the documents agree', { '/alpha': 'First', '/beta': 'Second' }, [['alpha-get', 0], ['beta-get', 0]]],
    ['one operation changed', { '/alpha': 'CHANGED', '/beta': 'Second' }, [['alpha-get', 1], ['beta-get', 0]]],
  ] as Array<[string, Record<string, string>, Array<[string, number]>]>)(
    'should attribute diffs to each contested id when %s',
    (_case, otherPaths, expected) => {
      const pair = pairOf(restSpec({ '/alpha': 'First', '/beta': 'Second' }), restSpec(otherPaths), [
        'alpha-get',
        'beta-get',
      ])

      expect(diffCountsOf(compareContestedOperations(pair))).toEqual(expected)
    },
  )

  // a claim is made on the raw id; the normalized form of a parametrized path is a different string
  test('should place a contested id whose path carries a parameter', () => {
    const pair = pairOf(restSpec({ '/users/{id}': 'First' }), restSpec({ '/users/{id}': 'CHANGED' }), [
      'users-_id_-get',
    ])

    expect(compareContestedOperations(pair).get('users-_id_-get')).toHaveLength(1)
  })

  // pinned so that a fix of the path mapping fails this test and says so
  test('should read a change under one of two same-shape paths as no change, the accepted blind spot', () => {
    const sameShapePathsSpec = (summary: string): string => restSpec({ '/{a}/{b}': summary, '/{c}/{d}': 'Second' })
    const pair = pairOf(sameShapePathsSpec('First'), sameShapePathsSpec('CHANGED'), ['_a_-_b_-get'])

    expect(compareContestedOperations(pair).get('_a_-_b_-get')).toEqual([])
  })

  /*
   * One id, two spellings of its path. The merged document keeps one spelling, so the id is derived from both base
   * paths, and every walked path that derives it adds its diffs. A rename of the path is recorded twice and
   * reported once.
   */
  test.each([
    [
      'the base path in servers, then in the path',
      restSpec({ '/res': 'First' }, servedUnder('/api/v1')),
      restSpec({ '/api/v1/res': 'CHANGED' }),
      'api-v1-res-get',
      ['replace', 'remove', 'rename'],
    ],
    [
      'the base path in the path, then in servers',
      restSpec({ '/api/v1/res': 'First' }),
      restSpec({ '/res': 'CHANGED' }, servedUnder('/api/v1')),
      'api-v1-res-get',
      ['replace', 'add', 'rename'],
    ],
    ['slug twins', restSpec({ '/res/data': 'Same' }), restSpec({ '/res-data': 'Same' }), 'res-data-get', [
      'remove',
      'add',
    ]],
    [
      'a slug twin only the other document adds',
      restSpec({ '/res/data': 'First' }),
      restSpec({ '/res/data': 'CHANGED', '/res-data': 'Other' }),
      'res-data-get',
      ['replace', 'add'],
    ],
    [
      'a path only the first document has, under its own base path',
      restSpec({ '/res/data': 'Same' }, servedUnder('/api')),
      restSpec({ '/api/res-data': 'Same' }),
      'api-res-data-get',
      ['remove', 'remove', 'remove', 'add'],
    ],
  ] as Array<[string, string, string, string, string[]]>)(
    'should attribute every spelling of one id: %s',
    (_case, anchor, other, operationId, actions) => {
      expect(actionsOf(compareContestedOperations(pairOf(anchor, other, [operationId])).get(operationId))).toEqual(
        actions,
      )
    },
  )

  // an empty list would read as "the documents agree"
  test('should leave out a contested id no walked path derives', () => {
    const pair = pairOf(restSpec({ '/res': 'First' }), restSpec({ '/res': 'CHANGED' }), ['res-get', 'ghost-get'])

    expect(diffCountsOf(compareContestedOperations(pair))).toEqual([['res-get', 1]])
  })
})

// the engine and the REST comparison together, on the case the feature exists for: one slug, two endpoints
test('should refuse two documents that derive one contested id from different paths', () => {
  const contestedId = 'res-data-get'
  const claimOf = (slug: string, path: string, summary: string): DocumentClaim => ({
    document: documentOf(slug, restSpec({ [path]: summary })),
    documentId: slug,
    operation: restOperation({ operationId: contestedId, documentId: slug }),
  })

  const claims: Claims<DocumentClaim> = new Map()
  collectClaim(claims, contestedId, claimOf(ANCHOR_SLUG, '/res/data', 'Read the resource'))
  collectClaim(claims, contestedId, claimOf(OTHER_SLUG, '/res-data', 'Delete everything'))

  expect(findContestedOperationConflicts(claims, compareContestedOperations))
    .toEqual([{ operationId: contestedId, contentDiffers: true, differingFields: [] }])
})
