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

import { Editor, exportDocumentMatcher, exportDocumentsMatcher, loadFileAsString, LocalRegistry } from './helpers'
import {
  BUILD_TYPE,
  ExportRestOperationsGroupBuildConfig,
  FILE_FORMAT_HTML,
  FILE_FORMAT_JSON,
  FILE_FORMAT_YAML,
  TRANSFORMATION_KIND_MERGED,
  TRANSFORMATION_KIND_REDUCED,
} from '../src'
import { loadYaml } from '@netcracker/qubership-apihub-api-unifier'
// import fs from 'fs/promises'
// import AdmZip = require('adm-zip')

// const EXPORT_RESULTS_PATH = 'test/versions/export_results'

let pkg: LocalRegistry
let editor: Editor
const GROUP_WITH_OPERATIONS_FROM_TWO_DOCUMENTS = 'GROUP_WITH_OPERATIONS_FROM_TWO_DOCUMENTS'
const GROUP_WITH_OPERATIONS_FROM_ONE_DOCUMENT_ONLY = 'GROUP_WITH_OPERATIONS_FROM_ONE_DOCUMENT_ONLY'

const groupToOperationIdsMap = {
  [GROUP_WITH_OPERATIONS_FROM_TWO_DOCUMENTS]: [
    'path1-get',
    'path2-post',
  ],
  [GROUP_WITH_OPERATIONS_FROM_ONE_DOCUMENT_ONLY]: [
    'path2-get',
    'path2-post',
  ],
}

const REGULAR_VERSION = 'regular-version@123'
const SINGLE_DOCUMENT_VERSION = 'single-document-version@24'
const SINGLE_DOCUMENT_VERSION_WITH_README = 'single-document-version-with-readme@31'
const NO_DOCUMENTS_VERSION = 'no-documents-version@51'

const EXPECTED_RESULT_FILE = 'result.yaml'

const COMMON_GROUP_EXPORT_CONFIG = {
  packageId: 'export',
  version: REGULAR_VERSION,
  groupName: GROUP_WITH_OPERATIONS_FROM_TWO_DOCUMENTS,
}

const COMMON_REDUCED_GROUP_EXPORT_CONFIG: Partial<ExportRestOperationsGroupBuildConfig> = {
  ...COMMON_GROUP_EXPORT_CONFIG,
  buildType: BUILD_TYPE.EXPORT_REST_OPERATIONS_GROUP,
  operationsSpecTransformation: TRANSFORMATION_KIND_REDUCED,
}

const COMMON_MERGED_GROUP_EXPORT_CONFIG: Partial<ExportRestOperationsGroupBuildConfig> = {
  ...COMMON_GROUP_EXPORT_CONFIG,
  buildType: BUILD_TYPE.EXPORT_REST_OPERATIONS_GROUP,
  operationsSpecTransformation: TRANSFORMATION_KIND_MERGED,
}

describe('Export test', () => {
  beforeAll(async () => {
    pkg = LocalRegistry.openPackage('export', groupToOperationIdsMap)
    await pkg.publish(pkg.packageId, { version: REGULAR_VERSION })
    await pkg.publish(pkg.packageId, { version: SINGLE_DOCUMENT_VERSION, files: [{ fileId: '1.yaml' }] })
    await pkg.publish(pkg.packageId, {
      version: SINGLE_DOCUMENT_VERSION_WITH_README,
      files: [{ fileId: '1.yaml' }, { fileId: 'README.md' }],
    })
    await pkg.publish(pkg.packageId, {
      version: NO_DOCUMENTS_VERSION,
      files: [{ fileId: 'Document.docx' }, { fileId: 'README.md' }, { fileId: 'Test.png' }],
    })

    editor = await Editor.openProject(pkg.packageId, pkg)

    // await fs.rm(EXPORT_RESULTS_PATH, { recursive: true, force: true })
    // await fs.mkdir(EXPORT_RESULTS_PATH)
  })

  // commented unnecessary writing to fs to speed up testing stage on CI
  // uncomment for debugging purposes
  //
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

  test('should export rest document to html', async () => {
    const result = await editor.run({
      buildType: BUILD_TYPE.EXPORT_REST_DOCUMENT,
      documentId: '1',
      format: FILE_FORMAT_HTML,
    })
    expect(result.exportFileName).toEqual('export_regular-version_1.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('1.html'),
      exportDocumentMatcher('ls.html'),
      exportDocumentMatcher('index.html'),
      exportDocumentMatcher('resources/corporatelogo.png'),
      exportDocumentMatcher('resources/styles.css'),
    ]))
  })

  test('should export rest document to json', async () => {
    const result = await editor.run({
      buildType: BUILD_TYPE.EXPORT_REST_DOCUMENT,
      documentId: '1',
      format: FILE_FORMAT_JSON,
    })
    expect(result.exportFileName).toEqual('export_regular-version_1.json')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('1.json'),
    ]))
  })

  test('should export rest document to yaml', async () => {
    const result = await editor.run({
      buildType: BUILD_TYPE.EXPORT_REST_DOCUMENT,
      documentId: '1',
      format: FILE_FORMAT_YAML,
    })
    expect(result.exportFileName).toEqual('export_regular-version_1.yaml')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('1.yaml'),
    ]))
  })

  test('should export version to html', async () => {
    const result = await editor.run({
      packageId: pkg.packageId,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: FILE_FORMAT_HTML,
    })
    expect(result.exportFileName).toEqual('export_regular-version.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('1.html'),
      exportDocumentMatcher('2.html'),
      exportDocumentMatcher('atui_graphql_changelog_base.graphql'),
      exportDocumentMatcher('Document.docx'),
      exportDocumentMatcher('Test.png'),
      exportDocumentMatcher('README.md'),

      exportDocumentMatcher('index.html'),
      exportDocumentMatcher('ls.html'),
      exportDocumentMatcher('resources/corporatelogo.png'),
      exportDocumentMatcher('resources/styles.css'),
    ]))
  })

  test('should export version to json', async () => {
    const result = await editor.run({
      packageId: pkg.packageId,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: FILE_FORMAT_JSON,
    })
    expect(result.exportFileName).toEqual('export_regular-version.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('1.json'),
      exportDocumentMatcher('2.json'),
      exportDocumentMatcher('atui_graphql_changelog_base.graphql'),
      exportDocumentMatcher('Document.docx'),
      exportDocumentMatcher('Test.png'),
      exportDocumentMatcher('README.md'),
    ]))
  })

  test('should export version to yaml', async () => {
    const result = await editor.run({
      packageId: pkg.packageId,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: FILE_FORMAT_YAML,
    })
    expect(result.exportFileName).toEqual('export_regular-version.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('1.yaml'),
      exportDocumentMatcher('2.yaml'),
      exportDocumentMatcher('atui_graphql_changelog_base.graphql'),
      exportDocumentMatcher('Document.docx'),
      exportDocumentMatcher('Test.png'),
      exportDocumentMatcher('README.md'),
    ]))
  })

  test('should export single document version to html', async () => {
    const result = await editor.run({
      version: SINGLE_DOCUMENT_VERSION,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: FILE_FORMAT_HTML,
    })
    expect(result.exportFileName).toEqual('export_single-document-version.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('1.html'),
      exportDocumentMatcher('index.html'),
      exportDocumentMatcher('ls.html'),
      exportDocumentMatcher('resources/corporatelogo.png'),
      exportDocumentMatcher('resources/styles.css'),
    ]))
  })

  test('should export single document version to json', async () => {
    const result = await editor.run({
      version: SINGLE_DOCUMENT_VERSION,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: FILE_FORMAT_JSON,
    })
    expect(result.exportFileName).toEqual('export_single-document-version_1.json')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('1.json'),
    ]))
  })

  test('should export single document version to yaml', async () => {
    const result = await editor.run({
      version: SINGLE_DOCUMENT_VERSION,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: FILE_FORMAT_YAML,
    })
    expect(result.exportFileName).toEqual('export_single-document-version_1.yaml')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('1.yaml'),
    ]))
  })

  test('should export single document version with readme to html', async () => {
    const result = await editor.run({
      version: SINGLE_DOCUMENT_VERSION_WITH_README,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: FILE_FORMAT_HTML,
    })
    expect(result.exportFileName).toEqual('export_single-document-version-with-readme.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('1.html'),
      exportDocumentMatcher('README.md'),

      exportDocumentMatcher('index.html'),
      exportDocumentMatcher('ls.html'),
      exportDocumentMatcher('resources/corporatelogo.png'),
      exportDocumentMatcher('resources/styles.css'),
    ]))
  })

  test('should export version without documents to html without adding any extra files', async () => {
    const result = await editor.run({
      version: NO_DOCUMENTS_VERSION,
      buildType: BUILD_TYPE.EXPORT_VERSION,
      format: FILE_FORMAT_HTML,
    })
    expect(result.exportFileName).toEqual('export_no-documents-version.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('Document.docx'),
      exportDocumentMatcher('README.md'),
      exportDocumentMatcher('Test.png'),
    ]))
  })

  test('should export reduced rest operations group to html', async () => {
    const result = await editor.run({
      ...COMMON_REDUCED_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_HTML,
    })
    expect(result.exportFileName).toEqual('export_regular-version_GROUP_WITH_OPERATIONS_FROM_TWO_DOCUMENTS.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('1.html'),
      exportDocumentMatcher('2.html'),

      exportDocumentMatcher('index.html'),
      exportDocumentMatcher('ls.html'),
      exportDocumentMatcher('resources/corporatelogo.png'),
      exportDocumentMatcher('resources/styles.css'),
    ]))
  })

  test('should export reduced rest operations group to html (operations originated from one document)', async () => {
    const result = await editor.run({
      ...COMMON_REDUCED_GROUP_EXPORT_CONFIG,
      groupName: GROUP_WITH_OPERATIONS_FROM_ONE_DOCUMENT_ONLY,
      format: FILE_FORMAT_HTML,
    })
    expect(result.exportFileName).toEqual('export_regular-version_GROUP_WITH_OPERATIONS_FROM_ONE_DOCUMENT_ONLY.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('2.html'),
      exportDocumentMatcher('index.html'),
      exportDocumentMatcher('ls.html'),
      exportDocumentMatcher('resources/corporatelogo.png'),
      exportDocumentMatcher('resources/styles.css'),
    ]))
  })

  test('should export reduced rest operations group to json', async () => {
    const result = await editor.run({
      ...COMMON_REDUCED_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_JSON,
    })
    expect(result.exportFileName).toEqual('export_regular-version_GROUP_WITH_OPERATIONS_FROM_TWO_DOCUMENTS.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('1.json'),
      exportDocumentMatcher('2.json'),
    ]))
  })

  test('should export reduced rest operations group to json (operations originated from one document)', async () => {
    const result = await editor.run({
      ...COMMON_REDUCED_GROUP_EXPORT_CONFIG,
      groupName: GROUP_WITH_OPERATIONS_FROM_ONE_DOCUMENT_ONLY,
      format: FILE_FORMAT_JSON,
    })
    expect(result.exportFileName).toEqual('export_regular-version_GROUP_WITH_OPERATIONS_FROM_ONE_DOCUMENT_ONLY.json')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('2.json'),
    ]))
  })

  test('should export reduced rest operations group to yaml', async () => {
    const result = await editor.run({
      ...COMMON_REDUCED_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_YAML,
    })
    expect(result.exportFileName).toEqual('export_regular-version_GROUP_WITH_OPERATIONS_FROM_TWO_DOCUMENTS.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('1.yaml'),
      exportDocumentMatcher('2.yaml'),
    ]))
  })

  test('should export reduced rest operations group to yaml (operations originated from one document)', async () => {
    const result = await editor.run({
      ...COMMON_REDUCED_GROUP_EXPORT_CONFIG,
      groupName: GROUP_WITH_OPERATIONS_FROM_ONE_DOCUMENT_ONLY,
      format: FILE_FORMAT_YAML,
    })
    expect(result.exportFileName).toEqual('export_regular-version_GROUP_WITH_OPERATIONS_FROM_ONE_DOCUMENT_ONLY.yaml')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('2.yaml'),
    ]))
  })

  test('should export merged rest operations group to html', async () => {
    const result = await editor.run({
      ...COMMON_MERGED_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_HTML,
    })
    expect(result.exportFileName).toEqual('export_regular-version_GROUP_WITH_OPERATIONS_FROM_TWO_DOCUMENTS.zip')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('GROUP_WITH_OPERATIONS_FROM_TWO_DOCUMENTS.html'),

      exportDocumentMatcher('ls.html'),
      exportDocumentMatcher('resources/corporatelogo.png'),
      exportDocumentMatcher('resources/styles.css'),
    ]))
  })

  test('should export merged rest operations group to json', async () => {
    const result = await editor.run({
      ...COMMON_MERGED_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_JSON,
    })
    expect(result.exportFileName).toEqual('export_regular-version_GROUP_WITH_OPERATIONS_FROM_TWO_DOCUMENTS.json')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('GROUP_WITH_OPERATIONS_FROM_TWO_DOCUMENTS.json'),
    ]))
    const expectedResult = JSON.stringify(loadYaml((await loadFileAsString(pkg.projectsDir, pkg.packageId, EXPECTED_RESULT_FILE))!), undefined, 2)
    expect(await result.exportDocuments[0].data.text()).toEqual(expectedResult)
  })

  test('should export merged rest operations group to yaml', async () => {
    const result = await editor.run({
      ...COMMON_MERGED_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_YAML,
    })
    expect(result.exportFileName).toEqual('export_regular-version_GROUP_WITH_OPERATIONS_FROM_TWO_DOCUMENTS.yaml')
    expect(result).toEqual(exportDocumentsMatcher([
      exportDocumentMatcher('GROUP_WITH_OPERATIONS_FROM_TWO_DOCUMENTS.yaml'),
    ]))
    const expectedResult = await loadFileAsString(pkg.projectsDir, pkg.packageId, EXPECTED_RESULT_FILE)
    expect(await result.exportDocuments[0].data.text()).toEqual(expectedResult)
  })
})
