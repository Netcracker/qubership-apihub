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

import { BUILD_TYPE, VERSION_STATUS } from '../src'
import { contentEditor, Editor, errorNotificationsOf, expectNotEmpty, LocalRegistry } from './helpers'

let pkg: LocalRegistry
const PACKAGE_ID = 'graphql'

describe('GraphQL test', () => {
  beforeAll(async () => {
    pkg = LocalRegistry.openPackage(PACKAGE_ID)
    await pkg.publish(pkg.packageId, {
      version: 'v1',
      packageId: pkg.packageId,
    })
    await pkg.publish(pkg.packageId, {
      version: 'v2',
      previousVersion: 'v1',
      packageId: pkg.packageId,
    })
  })

  test('should have operations from GraphQL documents', async () => {
    const editor = await Editor.openProject(PACKAGE_ID, pkg)
    const result = await editor.run({
      packageId: PACKAGE_ID,
      version: 'graphql',
      files: [
        { fileId: 'spec.gql' },
      ],
    })

    expect(result.operations.size).toBeTruthy()
  })

  test('should have changes with human-readable descriptions', async () => {
    const editor = await Editor.openProject(PACKAGE_ID, pkg)
    const result = await editor.run({
      packageId: PACKAGE_ID,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        { fileId: 'spec1.graphql' },
      ],
    })

    const changes = result.comparisons[0].data?.flatMap(data => data.diffs)

    expect(changes?.length).toBeTruthy()
    expect(changes?.every(change => change?.description)).toBeTruthy()
    //TODO BAD PERFORMANCE!
  }, 200000)

  describe('GraphQL operations', () => {
    test('should not have data for GraphQL operations', async () => {
      const pkg = LocalRegistry.openPackage('graphql')
      await pkg.publish('graphql', {
        packageId: 'graphql',
        version: 'v1',
        files: [{ fileId: 'spec.gql' }],
      })

      const resolvedOperations = await pkg.versionOperationsResolver('graphql', 'v1', 'graphql', undefined, true)
      expect(resolvedOperations).toBeTruthy()

      const graphqlOperations = resolvedOperations!.operations

      // GraphQL operations should exist in the operations list
      expectNotEmpty(graphqlOperations)

      // GraphQL operations should have undefined data (which prevents file creation)
      for (const operation of graphqlOperations) {
        expect(operation.data).toBeUndefined()
      }
    })
  })
})

describe('GraphQL introspection documents', () => {
  // a single query field, `book`
  const INTROSPECTION_SCHEMA = {
    queryType: { name: 'Query' },
    types: [{
      kind: 'OBJECT',
      name: 'Query',
      fields: [{ name: 'book', args: [], type: { kind: 'SCALAR', name: 'String' } }],
    }],
  }

  // a draft, so a document that fails to parse is reported rather than thrown
  const buildDraft = (packageId: string, fileId: string, content: unknown): ReturnType<Editor['run']> =>
    contentEditor({ packageId, version: 'v1' }, { [fileId]: JSON.stringify(content) })
      .run({ status: VERSION_STATUS.DRAFT, buildType: BUILD_TYPE.BUILD })

  // the parser tells an introspection from SDL in a `.gql` file by the `__schema` key in its text
  test('should build operations from an introspection in a .gql file', async () => {
    const result = await buildDraft('graphql/introspection-in-gql', 'schema.gql', {
      data: { __schema: INTROSPECTION_SCHEMA },
    })

    expect(errorNotificationsOf(result.notifications)).toEqual([])
    expect([...result.operations.values()].map(({ operationId }) => operationId)).toEqual(['query-book'])
  })

  // an introspection usually comes wrapped in the response's `data`; a bare one has `__schema` at the root
  test('should build operations from an introspection with __schema at the root', async () => {
    const result = await buildDraft('graphql/introspection-at-root', 'introspection.json', {
      __schema: INTROSPECTION_SCHEMA,
    })

    expect(errorNotificationsOf(result.notifications)).toEqual([])
    expect([...result.operations.values()].map(({ operationId }) => operationId)).toEqual(['query-book'])
  })
})
