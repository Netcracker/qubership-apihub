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
import { changelogOperationDiffs, contestedOperationDiffs, diffRestDocuments } from '../src/apitypes/rest/rest.utils'
import { restSpec } from './helpers/factories'

/*
 * What a comparison reads to decide whether one operation changed. Each case changes one thing between two
 * documents and states what lands in the operation's set. Most cases change document-level state the operation
 * depends on but does not contain: those are the parts a future edit can silently drop.
 */

const PATH = '/res/data'
const METHOD = OpenAPIV3.HttpMethods.GET
const SUMMARY_PATH = `paths/${PATH}/${METHOD}/summary`

const comparedOperation = (
  before: string,
  after: string,
  path: string,
  method: OpenAPIV3.HttpMethods,
): { merged: OpenAPIV3.Document; operation: OpenAPIV3.OperationObject } => {
  const { merged } = diffRestDocuments(
    parse(before) as OpenAPIV3.Document,
    parse(after) as OpenAPIV3.Document,
    undefined,
    undefined,
  )
  const pathItem = merged.paths[path] as OpenAPIV3.PathItemObject
  return { merged, operation: pathItem[method] as OpenAPIV3.OperationObject }
}

/** Compare the pair, then read the operation the way a check within one version reads it. */
const contestedDiffsOf = (
  before: string,
  after: string,
  path: string = PATH,
  method: OpenAPIV3.HttpMethods = METHOD,
): Diff[] => {
  const { merged, operation } = comparedOperation(before, after, path, method)
  return contestedOperationDiffs(merged, path, method, operation)
}

/** The same pair, read the way a changelog reads it; two single documents are the operation's own pair. */
const changelogDiffsOf = (
  before: string,
  after: string,
  path: string = PATH,
  method: OpenAPIV3.HttpMethods = METHOD,
  operationBelongsToPair: boolean = true,
): Diff[] => {
  const { merged, operation } = comparedOperation(before, after, path, method)
  return changelogOperationDiffs(merged, path, method, operation, operationBelongsToPair)
}

const declarationPathOf = (diff: Diff): string => {
  const before = (diff as { beforeDeclarationPaths?: PropertyKey[][] }).beforeDeclarationPaths?.[0]
  const after = (diff as { afterDeclarationPaths?: PropertyKey[][] }).afterDeclarationPaths?.[0]
  return ((after?.length ? after : before) ?? []).map(String).join('/')
}

/** The document with the operation under `PATH`. */
const specOf = (summary: string, options: Parameters<typeof restSpec>[1] = {}): string =>
  restSpec({ [PATH]: summary }, options)

const SERVER_A = 'servers: [{ url: \'https://a.example.com/api\' }]\n'
const SERVER_B = 'servers: [{ url: \'https://b.example.com/api\' }]\n'
const GUARDED_BY_FIRST = 'security: [{ first: [] }]\n'
const GUARDED_BY_SECOND = 'security: [{ second: [] }]\n'
const OWN_SECURITY = 'security: [{ second: [] }], '
const SCHEMES = `components:
  securitySchemes:
    first: { type: apiKey, name: k, in: header }
    second: { type: apiKey, name: s, in: header }
`
const schemeKeyNamed = (name: string): string =>
  `components:
  securitySchemes:
    first: { type: apiKey, name: ${name}, in: header }
`

describe('contestedOperationDiffs (the diffs an operation answers for)', () => {
  test.each([
    ['a change inside the operation', specOf('Create'), specOf('Changed'), [SUMMARY_PATH]],
    // `servers` sits at the document root, yet the operation resolves its base path from it
    ['a changed document server', specOf('Create', { root: SERVER_A }), specOf('Create', { root: SERVER_B }), [
      'servers/0/url',
    ]],
    // an operation that declares no `security` of its own is governed by the document's
    [
      'the document security when the operation declares none',
      specOf('Create', { root: GUARDED_BY_FIRST }) + SCHEMES,
      specOf('Create', { root: GUARDED_BY_SECOND }) + SCHEMES,
      ['security/0/first', 'security/0/second'],
    ],
    [
      'no document security when the operation declares its own',
      specOf('Create', { root: GUARDED_BY_FIRST, operationFields: OWN_SECURITY }) + SCHEMES,
      specOf('Create', { root: GUARDED_BY_SECOND, operationFields: OWN_SECURITY }) + SCHEMES,
      [],
    ],
    // the scheme's definition lives in `components`, outside the operation's subtree
    [
      'a changed security scheme the operation uses',
      specOf('Create', { root: GUARDED_BY_FIRST }) + schemeKeyNamed('KEY_A'),
      specOf('Create', { root: GUARDED_BY_FIRST }) + schemeKeyNamed('KEY_B'),
      ['components/securitySchemes/first/name'],
    ],
    // two documents of one version written against different dialects still describe one operation
    ['no OpenAPI version', specOf('Create', { openapi: '3.0.1' }), specOf('Create', { openapi: '3.1.0' }), []],
    [
      'a change inside the operation beside an OpenAPI version change',
      specOf('Create', { openapi: '3.0.1' }),
      specOf('Changed', { openapi: '3.1.0' }),
      [SUMMARY_PATH],
    ],
  ] as Array<[string, string, string, string[]]>)(
    'should attribute %s to the operation',
    (_case, before, after, expected) => {
      expect(contestedDiffsOf(before, after).map(declarationPathOf).sort()).toEqual([...expected].sort())
    },
  )

  // a rename is recorded against the path as well as among the path diffs; both forms report it once
  test('should include a renamed path parameter once', () => {
    const withParam = (name: string): string =>
      restSpec(
        { [`/users/{${name}}`]: 'Read' },
        { operationFields: `parameters: [{ name: ${name}, in: path, required: true, schema: { type: string } }], ` },
      )
    const renamesIn = (read: typeof contestedDiffsOf): Diff[] =>
      read(withParam('id'), withParam('userId'), '/users/{userId}', METHOD).filter(({ action }) => action === 'rename')

    expect(renamesIn(changelogDiffsOf)).toHaveLength(1)
    expect(renamesIn(contestedDiffsOf)).toHaveLength(1)
  })
})

/*
 * What the changelog's form adds. The OpenAPI version is the reason the check within one version has a form of its
 * own: a changelog reports a dialect bump as a change of every operation in the document, and a check within one
 * version must not, or two files written against different dialects refuse each other.
 */
describe('changelogOperationDiffs (what a changelog adds to that)', () => {
  test('should include the document OpenAPI version', () => {
    const bumped = [specOf('Create', { openapi: '3.0.1' }), specOf('Create', { openapi: '3.1.0' })] as const

    expect(contestedDiffsOf(...bumped)).toEqual([])
    expect(changelogDiffsOf(...bumped).map(declarationPathOf)).toEqual(['openapi'])
  })

  // `/res/data` and `/res-data` derive one operationId, so the changelog matches the operation to itself; the move
  // is recorded in the path diffs, which count only in the pair of the operation's own documents
  test('should include the path diffs only in the pair of the operation\'s own documents', () => {
    const respelled = [specOf('Create'), restSpec({ '/res-data': 'Create' })] as const

    expect(changelogDiffsOf(...respelled).map(({ action }) => action)).toEqual(['remove'])
    expect(changelogDiffsOf(...respelled, PATH, METHOD, false)).toEqual([])
  })
})
