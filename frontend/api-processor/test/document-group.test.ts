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

import { Editor, loadFileAsString, LocalRegistry } from './helpers'
import { BUILD_TYPE, REST_API_TYPE } from '../src'
import { load } from 'js-yaml'

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
const EXPECTED_RESULT_FILE = 'result.yaml'

describe('Document Group test', () => {
  test('should have documents stripped of operations other than from provided group', async () => {
    // todo
  })

  test('should have merged operations from provided group', async () => {
    // todo
  })

  test('should have properly merged documents', async () => {
    const pkg = LocalRegistry.openPackage('merge-operations', groupToOperationIdsMap)
    const editor = await Editor.openProject(pkg.packageId, pkg)

    await pkg.publish(pkg.packageId, { packageId: pkg.packageId })
    const result = await editor.run({
      packageId: pkg.packageId,
      buildType: BUILD_TYPE.MERGED_SPECIFICATION,
      groupName: GROUP_NAME,
      apiType: REST_API_TYPE,
    })
    const expectedResult = load((await loadFileAsString(pkg.projectsDir, pkg.packageId, EXPECTED_RESULT_FILE))!)
    expect(result.merged?.data).toEqual(expectedResult)
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
        expect.objectContaining({ fileId: '1.yaml', filename: '1.json' }),
        expect.objectContaining({ fileId: '2.yaml', filename: '2.json' }),
        expect.objectContaining({ fileId: '1-1.yaml', filename: '1-1.json' }),
        expect.objectContaining({ fileId: '1-2.yaml', filename: '1-2.json' }),
      ]),
    )

    for (const document of Array.from(result.documents.values())) {
      expect(Object.keys(document.data.paths).length).toEqual(document.operationIds.length)
    }
  })
})
