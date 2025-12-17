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

import { Editor, loadFileAsString, LocalRegistry, VERSIONS_PATH } from './helpers'
import { BUILD_TYPE, BuildConfigAggregator, BuildResult, PACKAGE, PackageNotifications, REST_API_TYPE } from '../src'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'

const GROUP_NAME = 'manualGroup'
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

const groupWithOneOperationIdsMap = {
  [GROUP_NAME]: [
    'path1-post',
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
const PATH_ITEMS_OPERATION_PATH = 'pathitems-operations'
type DOCUMENT_GROUP_PATHS = typeof BASE_OPERATION_PATH | typeof PATH_ITEMS_OPERATION_PATH

describe('Document Group test', () => {
  describe('Base path operations', () => {
    runCommonTests(BASE_OPERATION_PATH)

    test('should have documents stripped of operations other than from provided group', async () => {
      // todo
    })

    test('should have merged operations from provided group', async () => {
      // todo
    })

    test('should have properly merged documents', async () => {
      await runMergeOperationsCase('basic-documents-for-merge')
    })

    test('should have components schema object which is referenced', async () => {
      const { result } = await runPublishPackage(
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
  })

  describe('PathItems operations', () => {
    runCommonTests(PATH_ITEMS_OPERATION_PATH)

    test('should have properly merged documents', async () => {
      await runMergeOperationsCase('basic-documents-pathitems-for-merge')
    })

    test('should have properly merged documents mixed formats (operation + pathItems operation)', async () => {
      await runMergeOperationsCase('documents-pathitems-with-mixed-formats')
    })

    test('should have save pathItems in components', async () => {
      const { result } = await runPublishPackage(
        `document-group/${PATH_ITEMS_OPERATION_PATH}/multiple-pathitems-operations`,
        groupToOperationIdsMap,
      )

      for (const document of Array.from(result.documents.values())) {
        expect(Object.keys(document.data.components.pathItems).length).toEqual(document.operationIds.length)
      }
    })

    test('second level object are the same when overriding for pathitems response', async () => {
      const { pkg, result } = await runPublishPackage(
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
        const { result } = await runPublishPackage(
          `document-group/${PATH_ITEMS_OPERATION_PATH}/define-pathitems-via-reference-object-chain`,
          groupToOnePathOperationIdsMap,
        )

        for (const document of Array.from(result.documents.values())) {
          expect(document.data).toHaveProperty([...COMPONENTS_ITEM_1_PATH, 'post'])
          expect(document.data).toHaveProperty([...COMPONENTS_ITEM_1_PATH, 'get'])
        }
      })

      test('should have documents stripped of operations other than from provided group', async () => {
        const { result } = await runPublishPackage(
          `document-group/${PATH_ITEMS_OPERATION_PATH}/define-pathitems-via-reference-object-chain`,
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
      const { result } = await runPublishPackage(
        `document-group/${folder}/multiple-operations-in-one-path`,
        groupToOnePathOperationIdsMap,
      )

      for (const document of Array.from(result.documents.values())) {
        folder === PATH_ITEMS_OPERATION_PATH
          ? expect(Object.keys(document.data.components.pathItems['pathItem1']).length).toEqual(document.operationIds.length)
          : expect(Object.keys(document.data.paths['/path1']).length).toEqual(document.operationIds.length)
      }
    })

    test('should define operations with servers prefix', async () => {
      const { result } = await runPublishPackage(
        `document-group/${folder}/define-operations-with-servers-prefix`,
        groupToOneServerPrefixPathOperationIdsMap,
      )

      for (const document of Array.from(result.documents.values())) {
        expect(Object.keys(document.data.paths).length).toEqual(document.operationIds.length)
      }
    })

    test('should delete pathItems object which is not referenced', async () => {
      const { result } = await runPublishPackage(
        `document-group/${folder}/not-referenced-object`,
        groupToOperationIdsMap,
      )

      for (const document of Array.from(result.documents.values())) {
        folder === PATH_ITEMS_OPERATION_PATH
          ? expect(Object.keys(document.data.components.pathItems).length).toEqual(document.operationIds.length)
          : expect(Object.keys(document.data.paths).length).toEqual(document.operationIds.length)
      }
    })

    test('should have documents stripped of operations other than from provided group', async () => {
      const { result } = await runPublishPackage(
        `document-group/${folder}/stripped-of-operations`,
        groupToOperationIdsMap,
      )

      for (const document of Array.from(result.documents.values())) {
        expect(Object.keys(document.data.paths).length).toEqual(document.operationIds.length)
      }
    })

    test('should not hang up when processing for response which points to itself', async () => {
      const { result } = await runPublishPackage(
        `document-group/${folder}/not-hang-up-when-processing-for-response-which-points-to-itself`,
        groupToOnePathOperationIdsMap,
      )

      expect(result.documents.size).toEqual(0)
    })

    test('should not hang up when processing cycled chain for response', async () => {
      const pkg = LocalRegistry.openPackage(`document-group/${folder}/not-hang-up-when-processing-cycled-chain-for-response`, groupToOnePathOperationIdsMap)
      await pkg.publish(pkg.packageId, { packageId: pkg.packageId })

      const notificationFile = await loadFileAsString(
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
    const { pkg, result } = await runPublishPackage(
      `merge-operations/${caseName}`,
      groupToOperationIdsMap,
      { buildType: BUILD_TYPE.MERGED_SPECIFICATION, apiType: REST_API_TYPE },
    )

    const expectedResult = loadYaml(
      (await loadFileAsString(pkg.projectsDir, pkg.packageId, EXPECTED_RESULT_FILE))!,
    )

    expect(result.merged?.data).toEqual(expectedResult)
  }

  async function runPublishPackage(
    packageId: string,
    groupOperationIds: Record<string, string[]>,
    options: Partial<BuildConfigAggregator> = { buildType: BUILD_TYPE.REDUCED_SOURCE_SPECIFICATIONS },
  ): Promise<{ pkg: LocalRegistry; result: BuildResult }> {
    const pkg = LocalRegistry.openPackage(packageId, groupOperationIds)
    const editor = await Editor.openProject(pkg.packageId, pkg)
    await pkg.publish(pkg.packageId, { packageId: pkg.packageId })

    const result = await editor.run({
      ...{
        packageId: pkg.packageId,
        groupName: GROUP_NAME,
      },
      ...options,
    })
    return { pkg, result }
  }
})
