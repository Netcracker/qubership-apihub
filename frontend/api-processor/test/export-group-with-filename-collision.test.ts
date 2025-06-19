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

import { Editor, exportDocumentMatcher, exportDocumentsMatcher, LocalRegistry } from './helpers'
import {
  BUILD_TYPE,
  ExportRestOperationsGroupBuildConfig,
  FILE_FORMAT_HTML,
  FILE_FORMAT_JSON,
  FILE_FORMAT_YAML,
  TRANSFORMATION_KIND_REDUCED,
} from '../src'
// import fs from 'fs/promises'
// import AdmZip = require('adm-zip')

// const EXPORT_RESULTS_PATH = 'test/versions/export_results'

let editor: Editor
let dashboard: LocalRegistry
const GROUP_WITH_OPERATIONS_FROM_DOCUMENTS_WITH_THE_SAME_NAMES = 'GROUP_WITH_OPERATIONS_FROM_DOCUMENTS_WITH_THE_SAME_NAMES'

const groupToOperationIdsMap = {
  [GROUP_WITH_OPERATIONS_FROM_DOCUMENTS_WITH_THE_SAME_NAMES]: [
    'some-path1-get',
    'another-path1-put',
    'some-path2-post',
  ],
}

const COMMON_REDUCED_GROUP_EXPORT_CONFIG: Partial<ExportRestOperationsGroupBuildConfig> = {
  packageId: 'documents-collision',
  version: 'v1',
  groupName: GROUP_WITH_OPERATIONS_FROM_DOCUMENTS_WITH_THE_SAME_NAMES,
  buildType: BUILD_TYPE.EXPORT_REST_OPERATIONS_GROUP,
  operationsSpecTransformation: TRANSFORMATION_KIND_REDUCED,
}

describe('Export operations group with filename collision test', () => {
  beforeAll(async () => {
    dashboard = LocalRegistry.openPackage('documents-collision', groupToOperationIdsMap)
    const package1 = LocalRegistry.openPackage('documents-collision/package1')
    const package2 = LocalRegistry.openPackage('documents-collision/package2')
    const package3 = LocalRegistry.openPackage('documents-collision/package3')

    await dashboard.publish(dashboard.packageId, { packageId: dashboard.packageId })
    await package1.publish(package1.packageId, { packageId: package1.packageId })
    await package2.publish(package2.packageId, { packageId: package2.packageId })
    await package3.publish(package3.packageId, { packageId: package3.packageId })

    editor = await Editor.openProject(dashboard.packageId, dashboard)

    // await fs.rm(EXPORT_RESULTS_PATH, { recursive: true, force: true })
    // await fs.mkdir(EXPORT_RESULTS_PATH)
  })

  // afterEach(async () => {
  //   const { packageVersion, exportFileName } = await editor.createNodeVersionPackage()
  //   const infoPrefix = editor.config.operationsSpecTransformation
  //     ? `${editor.config.operationsSpecTransformation}___${editor.config.format}___`
  //     : `${editor.config.format}___`
  //
  //   if (exportFileName?.endsWith('.zip')) {
  //     const zip = new AdmZip(packageVersion)
  //     return zip.extractAllTo(`${EXPORT_RESULTS_PATH}/${infoPrefix}${exportFileName}`)
  //   }
  //   return await fs.writeFile(`${EXPORT_RESULTS_PATH}/${infoPrefix}${exportFileName}`, packageVersion)
  // })

  test('should export reduced rest operations group to yaml', async () => {
    const result = await editor.run({
      ...COMMON_REDUCED_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_YAML,
    })

    expect(result.exportFileName).toEqual('documents-collision_v1_GROUP_WITH_OPERATIONS_FROM_DOCUMENTS_WITH_THE_SAME_NAMES.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('package1_1.yaml'),
      exportDocumentMatcher('package1_2.yaml'),
      exportDocumentMatcher('package2_1.yaml'),
      exportDocumentMatcher('package3_1.yaml'),
    ]))
  })

  test('should export reduced rest operations group to json', async () => {
    const result = await editor.run({
      ...COMMON_REDUCED_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_JSON,
    })

    expect(result.exportFileName).toEqual('documents-collision_v1_GROUP_WITH_OPERATIONS_FROM_DOCUMENTS_WITH_THE_SAME_NAMES.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('package1_1.json'),
      exportDocumentMatcher('package1_2.json'),
      exportDocumentMatcher('package2_1.json'),
      exportDocumentMatcher('package3_1.json'),
    ]))
  })

  test('should export reduced rest operations group to html', async () => {
    const result = await editor.run({
      ...COMMON_REDUCED_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_HTML,
    })

    expect(result.exportFileName).toEqual('documents-collision_v1_GROUP_WITH_OPERATIONS_FROM_DOCUMENTS_WITH_THE_SAME_NAMES.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('package1_1.html'),
      exportDocumentMatcher('package1_2.html'),
      exportDocumentMatcher('package2_1.html'),
      exportDocumentMatcher('package3_1.html'),

      exportDocumentMatcher('index.html'),
      exportDocumentMatcher('ls.html'),
      exportDocumentMatcher('resources/corporatelogo.png'),
      exportDocumentMatcher('resources/styles.css'),
    ]))
  })
})
