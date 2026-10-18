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

import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'
import {
  BUILD_TYPE,
  BuildConfig,
  BuildConfigAggregator,
  BuildConfigFile,
  BuildResult,
  FILE_FORMAT_GRAPHQL,
  GRAPHQL_API_TYPE,
  MESSAGE_CATEGORY,
  MESSAGE_SEVERITY,
  PACKAGE,
  PackageNotifications,
  REST_API_TYPE,
  TRANSFORMATION_KIND_MERGED,
  TRANSFORMATION_KIND_REDUCED,
} from '../src'
import { parseGraphQLSource } from '../src/utils/graphql-transformer'
import { Editor, loadFileAsString, LocalRegistry, VERSIONS_PATH, loadFileAsStringFromRegistry, expectNotEmpty } from './helpers'

const GROUP_NAME = 'manualGroup'
const VERSION_ID = 'v1'
const groupToOperationIdsMap = {
  [GROUP_NAME]: [
    'path1-get',
    'path2-post',
  ],
}
const groupToOperationIdsMap2 = {
  [GROUP_NAME]: [
    'some-path1-get',
    'another-path1-put',
    'some-path2-post',
  ],
}

const groupToOnePathOperationIdsMap = {
  [GROUP_NAME]: [
    'path1-get',
    'path1-post',
  ],
}

const operationIdsForGroupWithSingleOperation = {
  [GROUP_NAME]: [
    'query-listPets',
  ],
}

const operationIdsForGroupWithMultipleOperations = {
  [GROUP_NAME]: [
    'query-listPets',
    'query-listUsers',
  ],
}

const groupWithOneOperationIdsMap = {
  [GROUP_NAME]: [
    'path1-post',
  ],
}

// The self-referencing fixtures declare `/path`, not `/path1`.
const groupToSelfReferencingOperationIdsMap = {
  [GROUP_NAME]: [
    'path-post',
  ],
}

const groupToOneServerPrefixPathOperationIdsMap = {
  [GROUP_NAME]: [
    'api-v1-path1-get',
    'api-v1-path2-post',
  ],
}

const EXPECTED_RESULT_FILE = 'result.yaml'

const BASE_OPERATION_PATH = 'path-operations'
const PATH_ITEMS_OPERATION_PATH = 'path-items-operations'
type DOCUMENT_GROUP_PATHS = typeof BASE_OPERATION_PATH | typeof PATH_ITEMS_OPERATION_PATH

async function runReducedFromContent(packageId: string, spec: string, operationIds: string[]): Promise<BuildResult> {
  const pkg = LocalRegistry.openPackage(packageId, { [GROUP_NAME]: operationIds })
  await pkg.publishFromContent(
    { '1.yaml': spec },
    { packageId, version: 'v1', files: [{ fileId: '1.yaml', publish: true }] },
  )
  const editor = new Editor(packageId, { packageId, version: 'v1' } as BuildConfig, {}, pkg)
  return editor.run({
    packageId,
    buildType: BUILD_TYPE.REDUCED_SOURCE_SPECIFICATIONS,
    groupName: GROUP_NAME,
    apiType: REST_API_TYPE,
  })
}

describe('Document Group test', () => {
  describe('Base path operations', () => {
    runCommonTests(BASE_OPERATION_PATH)

    test('should have properly merged documents', async () => {
      await runMergeOperationsCase('basic-documents-for-merge')
    })

    test('should exclude tags that have no operation in the group', async () => {
      const spec = `
      openapi: "3.0.0"
      info: { title: test, version: 0.1.0 }
      paths:
        /path1: { get: { tags: [Alpha], responses: { '200': { description: OK } } } }
        /path2: { get: { tags: [Beta], responses: { '200': { description: OK } } } }
      tags:
        - { name: Alpha, description: alpha tag }
        - { name: Beta, description: beta tag }
      `
      const result = await runReducedFromContent('tags-no-operation', spec, ['path1-get'])

      const [document] = Array.from(result.documents.values())
      expect(document.data.tags).toEqual([{ name: 'Alpha', description: 'alpha tag' }])
    })

    test('should drop all tags when the operation references an undeclared tag', async () => {
      const spec = `
      openapi: "3.0.0"
      info: { title: test, version: 0.1.0 }
      paths:
        /path1: { get: { tags: [Unknown], responses: { '200': { description: OK } } } }
      tags:
        - { name: Alpha, description: alpha tag }
        - { name: Beta, description: beta tag }
      `
      const result = await runReducedFromContent('tags-undeclared', spec, ['path1-get'])

      const [document] = Array.from(result.documents.values())
      expect(document.data).not.toHaveProperty('tags')
    })

    test('should keep the union of tags when the group has operations with different tags', async () => {
      const spec = `
      openapi: "3.0.0"
      info: { title: test, version: 0.1.0 }
      paths:
        /path1: { get: { tags: [Alpha], responses: { '200': { description: OK } } } }
        /path2: { get: { tags: [Beta], responses: { '200': { description: OK } } } }
      tags:
        - { name: Alpha, description: alpha tag }
        - { name: Beta, description: beta tag }
      `
      const result = await runReducedFromContent('tags-union', spec, ['path1-get', 'path2-get'])

      const [document] = Array.from(result.documents.values())
      expect(document.data.tags).toEqual([
        { name: 'Alpha', description: 'alpha tag' },
        { name: 'Beta', description: 'beta tag' },
      ])
    })

    test('should drop all tags when the group operation has no tags field', async () => {
      const spec = `
      openapi: "3.0.0"
      info: { title: test, version: 0.1.0 }
      paths:
        /path1: { get: { responses: { '200': { description: OK } } } }
      tags:
        - { name: Alpha, description: alpha tag }
        - { name: Beta, description: beta tag }
      `
      const result = await runReducedFromContent('tags-no-tags-field', spec, ['path1-get'])

      const [document] = Array.from(result.documents.values())
      expect(document.data).not.toHaveProperty('tags')
    })

    test('should have components schema object which is referenced', async () => {
      const { result } = await publishAndBuildGroup(
        `document-group/${BASE_OPERATION_PATH}/referenced-json-schema-object`,
        groupToOnePathOperationIdsMap,
      )

      for (const document of Array.from(result.documents.values())) {
        expect(document.data).toHaveProperty(['components', 'schemas', 'MySchema'])
      }
    })

    test('should rename documents with matching names', async () => {
      const dashboard = LocalRegistry.openPackage('documents-collision', groupToOperationIdsMap2)
      const package1 = LocalRegistry.openPackage('documents-collision/package1')
      const package2 = LocalRegistry.openPackage('documents-collision/package2')
      const package3 = LocalRegistry.openPackage('documents-collision/package3')

      await dashboard.publish(dashboard.packageId, { packageId: dashboard.packageId })
      await package1.publish(package1.packageId, { packageId: package1.packageId })
      await package2.publish(package2.packageId, { packageId: package2.packageId })
      await package3.publish(package3.packageId, { packageId: package3.packageId })

      const editor = await Editor.openProject(dashboard.packageId, dashboard)
      const result = await editor.run({
        packageId: dashboard.packageId,
        buildType: BUILD_TYPE.REDUCED_SOURCE_SPECIFICATIONS,
        groupName: GROUP_NAME,
        apiType: REST_API_TYPE,
      })

      expect(Array.from(result.documents.values())).toEqual(
        expect.toIncludeSameMembers([
          expect.objectContaining({
            fileId: 'documents-collision/package1_1.yaml',
            filename: 'documents-collision/package1_1.json',
          }),
          expect.objectContaining({
            fileId: 'documents-collision/package1_2.yaml',
            filename: 'documents-collision/package1_2.json',
          }),
          expect.objectContaining({
            fileId: 'documents-collision/package2_1.yaml',
            filename: 'documents-collision/package2_1.json',
          }),
          expect.objectContaining({
            fileId: 'documents-collision/package3_1.yaml',
            filename: 'documents-collision/package3_1.json',
          }),
        ]),
      )

      for (const document of Array.from(result.documents.values())) {
        expect(Object.keys(document.data.paths).length).toEqual(document.operationIds.length)
      }
    })

    describe('PathItems operations', () => {
      runCommonTests(PATH_ITEMS_OPERATION_PATH)

      test('should have properly merged documents', async () => {
        await runMergeOperationsCase('basic-documents-path-items-for-merge')
      })

      test('should have properly merged documents mixed formats (operation + pathItems operation)', async () => {
        await runMergeOperationsCase('documents-path-items-with-mixed-formats')
      })

      test('should exclude tags whose operation lives behind a $ref path item', async () => {
        const spec = `
        openapi: "3.1.0"
        info: { title: test, version: 0.1.0 }
        paths:
          /path1: { $ref: '#/components/pathItems/pathItem1' }
          /path2: { $ref: '#/components/pathItems/pathItem2' }
        tags:
          - { name: Alpha, description: alpha tag }
          - { name: Beta, description: beta tag }
        components:
          pathItems:
            pathItem1: { get: { tags: [Alpha], responses: { '200': { description: OK } } } }
            pathItem2: { get: { tags: [Beta], responses: { '200': { description: OK } } } }
        `
        const result = await runReducedFromContent('tags-pathitems', spec, ['path1-get'])

        const [document] = Array.from(result.documents.values())
        expect(document.data.tags).toEqual([{ name: 'Alpha', description: 'alpha tag' }])
      })

      test('should have save pathItems in components', async () => {
        const { result } = await publishAndBuildGroup(
          `document-group/${PATH_ITEMS_OPERATION_PATH}/multiple-path-items-operations`,
          groupToOperationIdsMap,
        )

        for (const document of Array.from(result.documents.values())) {
          expect(Object.keys(document.data.components.pathItems).length).toEqual(document.operationIds.length)
        }
      })

      test('second level object are the same when overriding for pathitems response', async () => {
        const { pkg, result } = await publishAndBuildGroup(
          `document-group/${PATH_ITEMS_OPERATION_PATH}/second-level-object-are-the-same-when-overriding-for-response`, groupToOnePathOperationIdsMap,
        )

        const expectedResult = loadYaml(
          (await loadFileAsString(pkg.projectsDir, pkg.packageId, EXPECTED_RESULT_FILE))!,
        )
        for (const document of Array.from(result.documents.values())) {
          expect(document.data).toEqual(expectedResult)
        }
      })

      describe('Chain pathItems Refs', () => {
        const COMPONENTS_ITEM_1_PATH = ['components', 'pathItems', 'componentsPathItem1']

        test('should have documents with keep pathItems in components', async () => {
          const { result } = await publishAndBuildGroup(
            `document-group/${PATH_ITEMS_OPERATION_PATH}/define-path-items-via-reference-object-chain`,
            groupToOnePathOperationIdsMap,
          )

          for (const document of Array.from(result.documents.values())) {
            expect(document.data).toHaveProperty([...COMPONENTS_ITEM_1_PATH, 'post'])
            expect(document.data).toHaveProperty([...COMPONENTS_ITEM_1_PATH, 'get'])
          }
        })

        test('should have documents stripped of operations other than from provided group', async () => {
          const { result } = await publishAndBuildGroup(
            `document-group/${PATH_ITEMS_OPERATION_PATH}/define-path-items-via-reference-object-chain`,
            groupWithOneOperationIdsMap,
          )

          for (const document of Array.from(result.documents.values())) {
            expect(document.data).toHaveProperty([...COMPONENTS_ITEM_1_PATH, 'post'])
            expect(document.data).not.toHaveProperty([...COMPONENTS_ITEM_1_PATH, 'get'])
          }
        })
      })
    })

    function runCommonTests(folder: DOCUMENT_GROUP_PATHS): void {
      test('should have keep a multiple operations in one path', async () => {
        const { result } = await publishAndBuildGroup(
          `document-group/${folder}/multiple-operations-in-one-path`,
          groupToOnePathOperationIdsMap,
        )

        for (const document of Array.from(result.documents.values())) {
          const expectedResult =
            folder === PATH_ITEMS_OPERATION_PATH
              ? Object.keys(document.data.components.pathItems['pathItem1']).length
              : Object.keys(document.data.paths['/path1']).length

          expect(expectedResult).toEqual(document.operationIds.length)
        }
      })

      test('should define operations with servers prefix', async () => {
        const { result } = await publishAndBuildGroup(
          `document-group/${folder}/define-operations-with-servers-prefix`,
          groupToOneServerPrefixPathOperationIdsMap,
        )

        for (const document of Array.from(result.documents.values())) {
          expect(Object.keys(document.data.paths).length).toEqual(document.operationIds.length)
        }
      })

      test('should delete pathItems object which is not referenced', async () => {
        // The two fixtures carry different operations: the base one has only `/path1: post`, so the
        // shared map matched nothing there and the build returned no documents at all.
        const { result } = await publishAndBuildGroup(
          `document-group/${folder}/not-referenced-object`,
          folder === PATH_ITEMS_OPERATION_PATH ? groupToOperationIdsMap : groupWithOneOperationIdsMap,
        )

        for (const document of Array.from(result.documents.values())) {
          const expectedResult =
            folder === PATH_ITEMS_OPERATION_PATH
              ? Object.keys(document.data.components.pathItems).length
              : Object.keys(document.data.paths).length

          expect(expectedResult).toEqual(document.operationIds.length)
        }
      })

      test('should have documents stripped of operations other than from provided group', async () => {
        const { result } = await publishAndBuildGroup(
          `document-group/${folder}/stripped-of-operations`,
          groupToOperationIdsMap,
        )

        for (const document of Array.from(result.documents.values())) {
          expect(Object.keys(document.data.paths).length).toEqual(document.operationIds.length)
        }
      })

      test('should not hang up when processing for response which points to itself', async () => {
        // `SuccessResponse` references itself. The group has to name the operation the fixture really
        // carries: with a map that matches nothing the build returns nothing, and the cycle is never walked.
        const { result } = await publishAndBuildGroup(
          `document-group/${folder}/not-hang-up-when-processing-for-response-which-points-to-itself`,
          groupToSelfReferencingOperationIdsMap,
        )

        expect(result.documents.size).toEqual(1)
      })

      test('should not hang up when processing cycled chain for response', async () => {
        const pkg = LocalRegistry.openPackage(`document-group/${folder}/not-hang-up-when-processing-cycled-chain-for-response`, groupToOnePathOperationIdsMap)
        await pkg.publish(pkg.packageId, { packageId: pkg.packageId, version: VERSION_ID, files: [{ fileId: 'spec.yaml' }] })

        const notificationFile = await loadFileAsStringFromRegistry(
          VERSIONS_PATH,
          `${pkg.packageId}/v1`,
          `${PACKAGE.NOTIFICATIONS_FILE_NAME}`,
        )
        expect(notificationFile).not.toBeNull()

        const { notifications } = JSON.parse(notificationFile!) as PackageNotifications

        const brokenRefMessages = [
          '$ref can\'t be resolved: #/components/responses/SuccessResponse2',
          '$ref can\'t be resolved: #/components/responses/SuccessResponse',
        ]

        brokenRefMessages.forEach((message) => {
          const found = notifications.some(notification => notification.message === message)
          expect(found).toBe(true)
        })
      })
    }

    async function runMergeOperationsCase(caseName: string): Promise<void> {
      const { pkg, result } = await publishAndBuildGroup(
        `document-group/merge/${caseName}`,
        groupToOperationIdsMap,
        { buildType: BUILD_TYPE.MERGED_SPECIFICATION, apiType: REST_API_TYPE },
        [{ fileId: 'spec1.yaml' }, { fileId: 'spec2.yaml' }],
      )

      const expectedResult = loadYaml(
        (await loadFileAsString(pkg.projectsDir, pkg.packageId, EXPECTED_RESULT_FILE))!,
      )

      expect(result.merged?.data).toEqual(expectedResult)
    }
  })

  describe('GraphQL document group', () => {
    const graphqlOptions: Partial<BuildConfigAggregator> = {
      buildType: TRANSFORMATION_KIND_REDUCED,
      apiType: GRAPHQL_API_TYPE,
      format: FILE_FORMAT_GRAPHQL,
    }
    const graphqlFiles = [{ fileId: 'queries-only.gql' }]

    test('operation group export should produce a valid GraphQL document', async () => {
      const { result } = await publishAndBuildGroup(
        'graphql/document-group',
        operationIdsForGroupWithSingleOperation,
        graphqlOptions,
        graphqlFiles,
      )

      expectNotEmpty(result.documents)

      const [document] = Array.from(result.documents.values())
      expect(typeof document.data).toBe('string')

      const schema = parseGraphQLSource(document.data as string)
      expect(schema.graphapi).toBeDefined()
    })

    test('should export only one operation from group', async () => {
      const { result } = await publishAndBuildGroup(
        'graphql/document-group',
        operationIdsForGroupWithSingleOperation,
        graphqlOptions,
        graphqlFiles,
      )

      const [document] = Array.from(result.documents.values())
      const schema = parseGraphQLSource(document.data as string)

      const queries = schema.queries ?? {}
      expect(Object.keys(queries)).toEqual(['listPets'])

      expect(schema.mutations).toBeUndefined()
      expect(schema.subscriptions).toBeUndefined()
    })

    test('should export include only requested operation from group', async () => {
      const { result } = await publishAndBuildGroup(
        'graphql/document-group',
        operationIdsForGroupWithMultipleOperations,
        graphqlOptions,
        graphqlFiles,
      )

      expectNotEmpty(result.documents)

      const [document] = Array.from(result.documents.values())
      const schema = parseGraphQLSource(document.data as string)
      const queries = schema.queries ?? {}
      expect(Object.keys(queries)).toEqual(['listPets', 'listUsers'])
    })

    test('should not support merged specification', async () => {
      await expect(publishAndBuildGroup(
        'graphql/document-group',
        operationIdsForGroupWithMultipleOperations,
        {
          buildType: TRANSFORMATION_KIND_MERGED,
          apiType: GRAPHQL_API_TYPE,
        },
        graphqlFiles,
      )).rejects.toThrow('mergedSourceSpecifications transformation is not supported for API type: graphql')
    })
  })

  // The fixtures these tests open carry no config.json, so the version and the file list are named here.
  // Only `publish` needs the list; a group build resolves its documents from the published version.
  // The three `document-group/merge` fixtures also hold a `result.yaml`, which the list keeps out of the build
  // the way the config's partial list did.
  async function publishAndBuildGroup(
    packageId: string,
    groupOperationIds: Record<string, string[]>,
    options: Partial<BuildConfigAggregator> = { buildType: BUILD_TYPE.REDUCED_SOURCE_SPECIFICATIONS },
    files: BuildConfigFile[] = [{ fileId: 'spec.yaml' }],
  ): Promise<{ pkg: LocalRegistry; result: BuildResult }> {
    const pkg = LocalRegistry.openPackage(packageId, groupOperationIds)
    const editor = await Editor.openProject(pkg.packageId, pkg)
    await pkg.publish(pkg.packageId, { packageId: pkg.packageId, version: VERSION_ID, files })

    const result = await editor.run({
      ...{
        packageId: pkg.packageId,
        version: VERSION_ID,
        groupName: GROUP_NAME,
      },
      ...options,
    })
    // A group build over a version that was never published is not an error: it warns and returns nothing.
    // Every caller below loops over `result.documents`, so an empty set would pass them all silently.
    expectNotEmpty(result.documents)
    return { pkg, result }
  }
})

// A group build resolves the documents that carry the group's operations. A group that matches none of them is
// not a failure: there is nothing to transform, and the build says so instead of returning an empty archive
// silently. `notifications.json` is written for this build type — only the export types return before it.
describe('A group that matches no operation', () => {
  const SPEC = `
  openapi: "3.0.0"
  info: { title: test, version: 0.1.0 }
  paths:
    /path1: { get: { responses: { '200': { description: OK } } } }
  `

  test('should report the empty group and still finish the build', async () => {
    const result = await runReducedFromContent('group-without-operations', SPEC, [])

    expect(result.documents.size).toBe(0)
    expect(result.notifications).toEqual([{
      category: MESSAGE_CATEGORY.GroupDocumentsMissing,
      severity: MESSAGE_SEVERITY.Warning,
      message: expect.stringContaining(GROUP_NAME),
    }])
  })
})
