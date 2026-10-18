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
import { FILE_FORMAT_GRAPHQL, FILE_FORMAT_HTML, FILE_FORMAT_JSON, FILE_FORMAT_YAML } from '../src/consts'
import { ExportAsyncApiOperationsGroupBuildConfig, OperationsApiType } from '../src/types'
import { Editor, LocalRegistry } from './helpers'
import { BUILD_TYPE, TRANSFORMATION_KIND_MERGED, TRANSFORMATION_KIND_REDUCED } from '../src'

/**
 * Operation IDs are computed as: calculateAsyncOperationId(asyncOperationId, messageId)
 * which resolves to `${slugify(asyncOperationId)}-${slugify(messageId)}` (case-preserved).
 *
 * valid-async-yaml.yaml: operation "sendUserSignedUp" + message "UserSignedUp"
 *   → operationId "sendUserSignedUp-UserSignedUp"
 *
 * valid-async-json.json: operation "sendUserSignedOut" + message "UserSignedOut"
 *   → operationId "sendUserSignedOut-UserSignedOut"
 */

describe('Export AsyncAPI Operations Group integration tests', () => {
  const ASYNC_API_EXPORT_PACKAGE = 'asyncapi-export'
  const VERSION = 'single-async-yaml-version@1'
  const GROUP_NAME = 'asyncapiGroup'

  // Computed by calculateAsyncOperationId(asyncOperationId, messageId)
  const OPERATION_ID_YAML = 'sendUserSignedUp-UserSignedUp'   // from valid-async-yaml.yaml
  const OPERATION_ID_JSON = 'sendUserSignedOut-UserSignedOut' // from valid-async-json.json

  const groupToOperationIdsMap = {
    [GROUP_NAME]: [OPERATION_ID_YAML, OPERATION_ID_JSON],
  }

  const COMMON_GROUP_EXPORT_CONFIG = {
    packageId: ASYNC_API_EXPORT_PACKAGE,
    version: VERSION,
    groupName: GROUP_NAME,
    apiType: 'asyncapi' as OperationsApiType,
  }

  const COMMON_ASYNC_API_GROUP_EXPORT_CONFIG: Partial<ExportAsyncApiOperationsGroupBuildConfig> = {
    ...COMMON_GROUP_EXPORT_CONFIG,
    buildType: BUILD_TYPE.EXPORT_ASYNC_API_OPERATIONS_GROUP,
    operationsSpecTransformation: TRANSFORMATION_KIND_REDUCED,
  }

  const COMMON_MERGED_ASYNC_API_GROUP_EXPORT_CONFIG: Partial<ExportAsyncApiOperationsGroupBuildConfig> = {
    ...COMMON_GROUP_EXPORT_CONFIG,
    buildType: BUILD_TYPE.EXPORT_ASYNC_API_OPERATIONS_GROUP,
    operationsSpecTransformation: TRANSFORMATION_KIND_MERGED,
  }

  describe('Formats tests', () => {
    let pkg: LocalRegistry
    let editor: Editor

    beforeAll(async () => {
      pkg = LocalRegistry.openPackage(ASYNC_API_EXPORT_PACKAGE, groupToOperationIdsMap)
      await pkg.publish(pkg.packageId, { packageId: pkg.packageId, version: VERSION })
      editor = await Editor.openProject(pkg.packageId, pkg)
    })

    test('should not export asyncapi document to html', async () => {
      await expect(editor.run({
        ...COMMON_ASYNC_API_GROUP_EXPORT_CONFIG,
        format: FILE_FORMAT_HTML,
      })).rejects.toThrow('Export format is not supported: html')
    })

    test('should not export asyncapi document to graphql format', async () => {
      await expect(editor.run({
        ...COMMON_ASYNC_API_GROUP_EXPORT_CONFIG,
        format: FILE_FORMAT_GRAPHQL,
      })).rejects.toThrow('Export format is not supported: graphql')
    })

    test('should export reduced asyncapi operations group to json', async () => {
      const result = await editor.run({
        ...COMMON_ASYNC_API_GROUP_EXPORT_CONFIG,
        format: FILE_FORMAT_JSON,
      })

      expect(result.exportFileName).toBeDefined()
      // Both YAML and JSON documents contribute one export document each
      expect(result.exportDocuments.length).toBe(2)

      for (const exportDocument of result.exportDocuments) {
        expect(exportDocument.filename).toMatch(/\.json$/)

        const text = await exportDocument.data.text()
        expect(text.length).toBeGreaterThan(0)

        const parsed = JSON.parse(text)
        expect(parsed.asyncapi).toBeDefined()
        expect(parsed.operations).toBeDefined()
      }
    })

    test('should export reduced asyncapi operations group to yaml', async () => {
      const result = await editor.run({
        ...COMMON_ASYNC_API_GROUP_EXPORT_CONFIG,
        format: FILE_FORMAT_YAML,
      })

      expect(result.exportFileName).toBeDefined()
      expect(result.exportDocuments.length).toBe(2)

      for (const exportDocument of result.exportDocuments) {
        expect(exportDocument.filename).toMatch(/\.yaml$/)

        const text = await exportDocument.data.text()
        expect(text.length).toBeGreaterThan(0)
        // YAML export should contain AsyncAPI structural keys as plain text
        expect(text).toContain('asyncapi:')
        expect(text).toContain('operations:')
      }
    })
  })

  test('should only include operations from the specified group', async () => {
    // Group contains only the YAML-file operation
    const singleOpGroup = {
      [GROUP_NAME]: [OPERATION_ID_YAML],
    }
    const singleOpPkg = LocalRegistry.openPackage(ASYNC_API_EXPORT_PACKAGE, singleOpGroup)
    await singleOpPkg.publish(singleOpPkg.packageId, { packageId: singleOpPkg.packageId, version: VERSION })
    const singleOpEditor = await Editor.openProject(singleOpPkg.packageId, singleOpPkg)

    const result = await singleOpEditor.run({
      ...COMMON_ASYNC_API_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_JSON,
    })

    // Only the YAML document matches — one export document
    expect(result.exportDocuments.length).toBe(1)

    const [exportDocument] = result.exportDocuments
    const text = await exportDocument.data.text()
    const parsed = JSON.parse(text)

    expect(parsed.operations).toBeDefined()
    // The AsyncAPI operation key (not the computed operationId) should be present
    expect(Object.keys(parsed.operations)).toContain('sendUserSignedUp')
    expect(Object.keys(parsed.operations)).not.toContain('sendUserSignedOut')
  })

  test('should include operations from different documents', async () => {
    // Group spans both the YAML document and the JSON document
    const crossDocGroup = {
      [GROUP_NAME]: [OPERATION_ID_YAML, OPERATION_ID_JSON],
    }
    const crossDocPkg = LocalRegistry.openPackage(ASYNC_API_EXPORT_PACKAGE, crossDocGroup)
    await crossDocPkg.publish(crossDocPkg.packageId, { packageId: crossDocPkg.packageId, version: VERSION })
    const crossDocEditor = await Editor.openProject(crossDocPkg.packageId, crossDocPkg)

    const result = await crossDocEditor.run({
      ...COMMON_ASYNC_API_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_JSON,
    })

    // Each source document contributes its own export document
    expect(result.exportDocuments.length).toBe(2)

    const allOperationKeys = new Set<string>()
    for (const doc of result.exportDocuments) {
      const text = await doc.data.text()
      const parsed = JSON.parse(text)
      if (parsed.operations) {
        for (const key of Object.keys(parsed.operations)) {
          allOperationKeys.add(key)
        }
      }
    }

    expect(allOperationKeys.has('sendUserSignedUp')).toBe(true)
    expect(allOperationKeys.has('sendUserSignedOut')).toBe(true)
  })

  test('should not export merged asyncapi operations group', async () => {
    const pkg = LocalRegistry.openPackage(ASYNC_API_EXPORT_PACKAGE, groupToOperationIdsMap)
    await pkg.publish(pkg.packageId, { packageId: pkg.packageId, version: VERSION })
    const editor = await Editor.openProject(pkg.packageId, pkg)

    await expect(editor.run({
      ...COMMON_MERGED_ASYNC_API_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_JSON,
    })).rejects.toThrow('This transformation kind is not supported for asyncapi apiType')
  })
})
