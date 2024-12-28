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
})
