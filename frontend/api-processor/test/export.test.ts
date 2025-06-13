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

import { Editor, LocalRegistry } from './helpers'
import {
  BUILD_TYPE,
  ExportRestOperationsGroupBuildConfig,
  HTML_EXPORT_GROUP_FORMAT,
  JSON_EXPORT_GROUP_FORMAT,
  TRANSFORMATION_KIND_MERGED,
  TRANSFORMATION_KIND_REDUCED,
  YAML_EXPORT_GROUP_FORMAT,
} from '../src'
// import fs from 'fs/promises'

// const EXPORT_RESULTS_PATH = 'test/versions/export_results'

let pkg: LocalRegistry
let editor: Editor
const GROUP_NAME = 'manualGroup'
const groupToOperationIdsMap2 = {
  [GROUP_NAME]: [
    'path1-get',
    'path2-post',
  ],
}

const REGULAR_VERSION = 'regular-version@123'
const SINGLE_DOCUMENT_VERSION = 'single-document-version@24'

const COMMON_GROUP_EXPORT_CONFIG = {
  packageId: 'export',
  version: REGULAR_VERSION,
  groupName: GROUP_NAME,
}

const COMMON_REDUCED_GROUP_EXPORT_CONFIG: Partial<ExportRestOperationsGroupBuildConfig> = {
  ...COMMON_GROUP_EXPORT_CONFIG,
  groupName: GROUP_NAME,
  buildType: BUILD_TYPE.EXPORT_REST_OPERATIONS_GROUP,
  operationsSpecTransformation: TRANSFORMATION_KIND_REDUCED,
}

const COMMON_MERGED_GROUP_EXPORT_CONFIG: Partial<ExportRestOperationsGroupBuildConfig> = {
  ...COMMON_GROUP_EXPORT_CONFIG,
  groupName: GROUP_NAME,
  buildType: BUILD_TYPE.EXPORT_REST_OPERATIONS_GROUP,
  operationsSpecTransformation: TRANSFORMATION_KIND_MERGED,
}

describe('Export test', () => {
  beforeAll(async () => {
    pkg = LocalRegistry.openPackage('export')
    await pkg.publish(pkg.packageId, {version: REGULAR_VERSION})
    await pkg.publish(pkg.packageId, {version: SINGLE_DOCUMENT_VERSION, files: [{fileId: '1.yaml'}]})

    editor = await Editor.openProject(pkg.packageId, pkg)

    // try {
    //   await fs.mkdir(EXPORT_RESULTS_PATH)
    // } catch (e) {
      //
    // }
  })

  // afterEach(async () => {
  //   const { packageVersion, exportFileName } = await editor.createNodeVersionPackage()
  //   await fs.writeFile(`${EXPORT_RESULTS_PATH}/${exportFileName}`, packageVersion)
  // })

  test('should export rest document to html', async () => {
    const result = await editor.run({
      buildType: BUILD_TYPE.EXPORT_REST_DOCUMENT,
      documentId: '1',
      format: 'html',
    })
    expect(result.exportFileName).toEqual('export_regular-version_1.zip')
    // todo check zip content
  })

  test('should export rest document to json', async () => {
    const result = await editor.run({
      buildType: BUILD_TYPE.EXPORT_REST_DOCUMENT,
      documentId: '1',
      format: 'json',
    })
    expect(result.exportFileName).toEqual('export_regular-version_1.json')
    // todo check zip content
  })

  test('should export rest document to yaml', async () => {
    const result = await editor.run({
      buildType: BUILD_TYPE.EXPORT_REST_DOCUMENT,
      documentId: '1',
      format: 'yaml',
    })
    expect(result.exportFileName).toEqual('export_regular-version_1.yaml')
    // todo check zip content
  })

  test('should export version to html', async () => {
    const result = await editor.run({
      packageId: pkg.packageId,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: 'html',
    })
    expect(result.exportFileName).toEqual('export_regular-version.zip')
    // todo check zip content
  })

  test('should export version to json', async () => {
    const result = await editor.run({
      packageId: pkg.packageId,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: 'json',
    })
    expect(result.exportFileName).toEqual('export_regular-version.zip')
    // todo check zip content
  })

  test('should export version to yaml', async () => {
    const result = await editor.run({
      packageId: pkg.packageId,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: 'yaml',
    })
    expect(result.exportFileName).toEqual('export_regular-version.zip')
    // todo check zip content
  })

  test('should export single document version to html', async () => {
    const result = await editor.run({
      version: SINGLE_DOCUMENT_VERSION,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: 'html',
    })
    expect(result.exportFileName).toEqual('export_single-document-version.zip')
    // todo check zip content
  })

  test('should export single document version to json', async () => {
    const result = await editor.run({
      version: SINGLE_DOCUMENT_VERSION,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: 'json',
    })
    expect(result.exportFileName).toEqual('export_single-document-version_1.json')
    // todo check zip content
  })

  test('should export single document version to yaml', async () => {
    const result = await editor.run({
      version: SINGLE_DOCUMENT_VERSION,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: 'yaml',
    })
    expect(result.exportFileName).toEqual('export_single-document-version_1.yaml')
    // todo check zip content
  })

  // todo check case with readme

  // todo same 3 tests but without extensions? (excessive)

  test('should export reduced rest operations group to html', async () => {
    pkg = LocalRegistry.openPackage('export', groupToOperationIdsMap2)
    editor = await Editor.openProject(pkg.packageId, pkg)

    const result = await editor.run({
      ...COMMON_REDUCED_GROUP_EXPORT_CONFIG,
      format: HTML_EXPORT_GROUP_FORMAT,
    })
    expect(result.exportFileName).toEqual('export_regular-version_manualGroup.zip')
    // todo check zip content
  })

  test('should export reduced rest operations group to json', async () => {
    pkg = LocalRegistry.openPackage('export', groupToOperationIdsMap2)
    editor = await Editor.openProject(pkg.packageId, pkg)

    const result = await editor.run({
      ...COMMON_REDUCED_GROUP_EXPORT_CONFIG,
      format: JSON_EXPORT_GROUP_FORMAT,
    })
    expect(result.exportFileName).toEqual('export_regular-version_manualGroup.zip')
    // todo check zip content
  })

  test('should export reduced rest operations group to yaml', async () => {
    pkg = LocalRegistry.openPackage('export', groupToOperationIdsMap2)
    editor = await Editor.openProject(pkg.packageId, pkg)

    const result = await editor.run({
      ...COMMON_REDUCED_GROUP_EXPORT_CONFIG,
      format: YAML_EXPORT_GROUP_FORMAT,
    })
    expect(result.exportFileName).toEqual('export_regular-version_manualGroup.zip')
    // todo check zip content
  })

  test('should export merged rest operations group to html', async () => {
    pkg = LocalRegistry.openPackage('export', groupToOperationIdsMap2)
    editor = await Editor.openProject(pkg.packageId, pkg)
    const result = await editor.run({
      ...COMMON_MERGED_GROUP_EXPORT_CONFIG,
      format: HTML_EXPORT_GROUP_FORMAT,
    })
    expect(result.exportFileName).toEqual('export_regular-version_manualGroup.zip')
    // todo check zip content
  })

  test('should export merged rest operations group to json', async () => {
    pkg = LocalRegistry.openPackage('export', groupToOperationIdsMap2)
    editor = await Editor.openProject(pkg.packageId, pkg)
    const result = await editor.run({
      ...COMMON_MERGED_GROUP_EXPORT_CONFIG,
      format: JSON_EXPORT_GROUP_FORMAT,
    })
    expect(result.exportFileName).toEqual('export_regular-version_manualGroup.json')
    // todo check zip content
  })

  test('should export merged rest operations group to yaml', async () => {
    pkg = LocalRegistry.openPackage('export', groupToOperationIdsMap2)
    editor = await Editor.openProject(pkg.packageId, pkg)

    const result = await editor.run({
      ...COMMON_MERGED_GROUP_EXPORT_CONFIG,
      format: YAML_EXPORT_GROUP_FORMAT,
    })
    expect(result.exportFileName).toEqual('export_regular-version_manualGroup.yaml')
    // todo check zip content
  })
})
