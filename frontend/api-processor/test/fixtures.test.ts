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
  ANY_ASYNCAPI_CHANGE,
  ANY_ASYNCAPI_SPEC,
  ANY_DDL_SPEC,
  ANY_GRAPHQL_CHANGE,
  ANY_REST_CHANGE,
  ANY_REST_SPEC,
  buildChangelogFromContent,
  buildPackageFromContent,
  expectChangeCounts,
  contentEditor,
  expectNotEmpty,
  publishChangeFromContent,
} from './helpers'
import {
  ANNOTATION_CHANGE_TYPE,
  ASYNCAPI_API_TYPE,
  BREAKING_CHANGE_TYPE,
  BUILD_TYPE,
  GRAPHQL_API_TYPE,
  REST_API_TYPE,
  VERSION_STATUS,
} from '../src'
import { BuildResult, OperationsApiType } from '../src/types'
import { ChangeSummary } from '../src/types/external/comparison'

// the guarantees the JSDoc in `fixtures.ts` promises: an edit that breaks one fails here first

describe('Standard fixtures', () => {
  // the slug names each row's package; a name holds spaces and dots, which an id on disk should not
  const singles: Array<[string, string, string, string]> = [
    ['ANY_REST_SPEC under .json', 'rest-json', 'rest.json', ANY_REST_SPEC],
    ['ANY_REST_SPEC under .yaml', 'rest-yaml', 'rest.yaml', ANY_REST_SPEC],
    ['ANY_REST_CHANGE.before', 'rest-change-before', 'before.yaml', ANY_REST_CHANGE.before],
    ['ANY_REST_CHANGE.after', 'rest-change-after', 'after.yaml', ANY_REST_CHANGE.after],
    ['ANY_GRAPHQL_CHANGE.before', 'graphql-change-before', 'before.gql', ANY_GRAPHQL_CHANGE.before],
    ['ANY_GRAPHQL_CHANGE.after', 'graphql-change-after', 'after.gql', ANY_GRAPHQL_CHANGE.after],
    ['ANY_ASYNCAPI_SPEC', 'asyncapi-spec', 'async.yaml', ANY_ASYNCAPI_SPEC],
    ['ANY_ASYNCAPI_CHANGE.before', 'asyncapi-change-before', 'before.yaml', ANY_ASYNCAPI_CHANGE.before],
    ['ANY_ASYNCAPI_CHANGE.after', 'asyncapi-change-after', 'after.yaml', ANY_ASYNCAPI_CHANGE.after],
  ]

  // a release is refused on any Error, and a Warning would not refuse it, so the empty list is the check
  test.each(singles)('should publish %s as a release with one operation and no notifications', async (_name, slug, fileId, content) => {
    const result = await buildPackageFromContent(`fixtures/single/${slug}`, fileId, content)

    expect(result.notifications).toEqual([])
    expect(result.documents.size).toBe(1)
    expect(result.operations.size).toBe(1)
  })

  test('should publish ANY_DDL_SPEC as a release with one DDL document and no notifications', async () => {
    const result = await buildPackageFromContent('fixtures/single/ddl', 'widgets.sql', ANY_DDL_SPEC)

    expect(result.notifications).toEqual([])
    expect([...result.documents.values()].map(({ type }) => type)).toEqual(['ddl'])
  })

  const changes: Array<[string, () => Promise<BuildResult>, OperationsApiType, keyof ChangeSummary]> = [
    [
      'ANY_REST_CHANGE',
      () => buildChangelogFromContent('fixtures/change/rest', ANY_REST_CHANGE),
      REST_API_TYPE,
      ANNOTATION_CHANGE_TYPE,
    ],
    [
      'ANY_GRAPHQL_CHANGE',
      // a GraphQL schema is recognized by its `.gql` file id
      () => buildChangelogFromContent('fixtures/change/graphql', ANY_GRAPHQL_CHANGE, { extension: 'gql' }),
      GRAPHQL_API_TYPE,
      BREAKING_CHANGE_TYPE,
    ],
    [
      'ANY_ASYNCAPI_CHANGE',
      () => buildChangelogFromContent('fixtures/change/asyncapi', ANY_ASYNCAPI_CHANGE),
      ASYNCAPI_API_TYPE,
      BREAKING_CHANGE_TYPE,
    ],
  ]

  // the change sits inside the one operation, which is what an operation-level comparison walks
  test.each(changes)('should compare %s into one operation change and no notifications', async (_name, build, apiType, severity) => {
    const result = await build()

    expect(result.notifications).toEqual([])
    expect(result.comparisonNotifications).toEqual([])
    expect(result.comparisons).toHaveLength(1)
    const [comparison] = result.comparisons
    expect(comparison.notifications).toEqual([])
    expect(comparison.data).toHaveLength(1)
    expectNotEmpty(comparison.data![0].diffs)
    expectChangeCounts(result, { changes: { [severity]: 1 }, impacted: { [severity]: 1 } }, apiType)
  })

  // the shape a build of a new version takes: `after` built against the published `v1` it replaces
  test('should build ANY_REST_CHANGE.after against its published before into one comparison and no notifications', async () => {
    const packageId = 'fixtures/change/rest-build'
    const registry = await publishChangeFromContent(packageId, ANY_REST_CHANGE)
    const result = await contentEditor(
      { packageId, version: 'v2', previousVersion: 'v1', status: VERSION_STATUS.RELEASE, buildType: BUILD_TYPE.BUILD },
      { 'after.yaml': ANY_REST_CHANGE.after },
      registry,
    ).run()

    expect(result.notifications).toEqual([])
    expect(result.comparisonNotifications).toEqual([])
    expect(result.comparisons.map(({ notifications }) => notifications)).toEqual([[]])
    expect(result.comparisons[0].data).toHaveLength(1)
    expectChangeCounts(result, { changes: { [ANNOTATION_CHANGE_TYPE]: 1 }, impacted: { [ANNOTATION_CHANGE_TYPE]: 1 } })
  })
})
