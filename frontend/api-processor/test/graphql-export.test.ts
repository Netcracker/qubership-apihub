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
import { ExportGraphQLOperationsGroupBuildConfig, OperationsApiType } from '../src/types'
import { Editor, LocalRegistry } from './helpers'
import { BUILD_TYPE, TRANSFORMATION_KIND_MERGED, TRANSFORMATION_KIND_REDUCED } from '../src'
import { parseGraphQLSource } from '../src/utils/graphql-transformer'

describe('Export GraphQL Operations Group integration tests', () => {
  const GRAPHQL_EXPORT_PACKAGE = 'graphql-export'
  const VERSION = 'v1@1'
  const GROUP_NAME = 'graphqlGroup'

  const groupToOperationIdsMap = {
    [GROUP_NAME]: [
      'query-listPets',
      'query-getPet',
    ],
  }

  const COMMON_GROUP_EXPORT_CONFIG = {
    packageId: GRAPHQL_EXPORT_PACKAGE,
    version: VERSION,
    groupName: GROUP_NAME,
    apiType: 'graphql' as OperationsApiType,
  }

  const COMMON_GRAPHQL_GROUP_EXPORT_CONFIG: Partial<ExportGraphQLOperationsGroupBuildConfig> = {
    ...COMMON_GROUP_EXPORT_CONFIG,
    buildType: BUILD_TYPE.EXPORT_GRAPHQL_OPERATIONS_GROUP,
    operationsSpecTransformation: TRANSFORMATION_KIND_REDUCED,
  }

  const COMMON_MERGED_GRAPHQL_GROUP_EXPORT_CONFIG: Partial<ExportGraphQLOperationsGroupBuildConfig> = {
    ...COMMON_GROUP_EXPORT_CONFIG,
    buildType: BUILD_TYPE.EXPORT_GRAPHQL_OPERATIONS_GROUP,
    operationsSpecTransformation: TRANSFORMATION_KIND_MERGED,
  }

  describe('Formats tests', () => {
    let pkg: LocalRegistry
    let editor: Editor

    beforeAll(async () => {
      pkg = LocalRegistry.openPackage(GRAPHQL_EXPORT_PACKAGE, groupToOperationIdsMap)
      await pkg.publish(pkg.packageId, { packageId: pkg.packageId, version: VERSION })
      editor = await Editor.openProject(pkg.packageId, pkg)
    })

    test('should not export graphql document to json', async () => {
      await expect(editor.run({
        ...COMMON_GRAPHQL_GROUP_EXPORT_CONFIG,
        format: FILE_FORMAT_JSON,
      })).rejects.toThrow('Export format is not supported: json')
    })

    test('should not export graphql document to yaml', async () => {
      await expect(editor.run({
        ...COMMON_GRAPHQL_GROUP_EXPORT_CONFIG,
        format: FILE_FORMAT_YAML,
      })).rejects.toThrow('Export format is not supported: yaml')
    })

    test('should export reduced graphql operations group to graphql', async () => {
      const result = await editor.run({
        ...COMMON_GRAPHQL_GROUP_EXPORT_CONFIG,
        format: FILE_FORMAT_GRAPHQL,
      })

      expect(result.exportFileName).toBeDefined()
      expect(result.exportDocuments.length).toBe(1)

      const [exportDocument] = result.exportDocuments
      expect(exportDocument.filename).toMatch(/\.graphql$/)

      const text = await exportDocument.data.text()
      expect(text.length).toBeGreaterThan(0)

      const schema = parseGraphQLSource(text)
      expect(schema.graphapi).toBeDefined()
    })

    // TODO run it when it's ready GraphQL HTML Export support
    test.skip('should export reduced graphql operations group to html', async () => {
      const result = await editor.run({
        ...COMMON_GRAPHQL_GROUP_EXPORT_CONFIG,
        format: FILE_FORMAT_HTML,
      })

      expect(result.exportDocuments.length).toBeGreaterThan(0)

      const graphqlDocs = result.exportDocuments
        .filter(exportDocument => exportDocument.filename.endsWith('.html') && !['index.html', 'ls.html']
          .includes(exportDocument.filename))
      expect(graphqlDocs.length).toBeGreaterThan(0)
    })
  })

  test('should only include operations from the specified group', async () => {
    const singleOpGroup = {
      [GROUP_NAME]: ['query-listPets'],
    }
    const singleOpPkg = LocalRegistry.openPackage(GRAPHQL_EXPORT_PACKAGE, singleOpGroup)
    await singleOpPkg.publish(singleOpPkg.packageId, { packageId: singleOpPkg.packageId, version: VERSION })
    const singleOpEditor = await Editor.openProject(singleOpPkg.packageId, singleOpPkg)

    const result = await singleOpEditor.run({
      ...COMMON_GRAPHQL_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_GRAPHQL,
    })

    const [exportDocument] = result.exportDocuments
    const text = await exportDocument.data.text()
    const schema = parseGraphQLSource(text)

    expect(schema.queries).toBeDefined()
    if (schema.queries) {
      expect(Object.keys(schema.queries)).toEqual(['listPets'])
    }
    expect(schema.mutations).toBeUndefined()
    expect(schema.subscriptions).toBeUndefined()
  })

  test('should include operations from different documents', async () => {
    const crossDocGroup = {
      [GROUP_NAME]: [
        'query-listPets',
        'query-listUsers',
      ],
    }
    const crossDocPkg = LocalRegistry.openPackage(GRAPHQL_EXPORT_PACKAGE, crossDocGroup)
    await crossDocPkg.publish(crossDocPkg.packageId, { packageId: crossDocPkg.packageId, version: VERSION })
    const crossDocEditor = await Editor.openProject(crossDocPkg.packageId, crossDocPkg)

    const result = await crossDocEditor.run({
      ...COMMON_GRAPHQL_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_GRAPHQL,
    })

    expect(result.exportDocuments.length).toBe(2)

    const allQueries = new Set<string>()
    for (const doc of result.exportDocuments) {
      const text = await doc.data.text()
      const schema = parseGraphQLSource(text)
      if (schema.queries) {
        for (const name of Object.keys(schema.queries)) {
          allQueries.add(name)
        }
      }
    }

    expect(Array.from(allQueries)).toEqual(['listPets', 'listUsers'])
  })

  test('should not export merged graphql operations group', async () => {
    const pkg = LocalRegistry.openPackage(GRAPHQL_EXPORT_PACKAGE, groupToOperationIdsMap)
    await pkg.publish(pkg.packageId, { packageId: pkg.packageId, version: VERSION })
    const editor = await Editor.openProject(pkg.packageId, pkg)

    await expect(editor.run({
      ...COMMON_MERGED_GRAPHQL_GROUP_EXPORT_CONFIG,
      format: FILE_FORMAT_HTML,
    })).rejects.toThrow('This transformation kind is not supported for graphql apiType')
  })
})
