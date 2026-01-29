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
  buildChangelogDashboard,
  buildChangelogPackage,
  buildGqlChangelogPackage,
  DEFAULT_PROJECTS_PATH,
  Editor,
  loadFileAsString,
  LocalRegistry,
} from './helpers'
import {
  BUILD_TYPE,
  BuildConfigFile,
  BuildResult,
  createComparisonInternalDocumentId,
  OperationChanges,
  VERSION_STATUS,
} from '../src'

describe('Comparison Internal Documents tests', () => {

  describe('Comparison documents id unit tests', () => {
    it('should create different ids for prev and curr documents ', () => {
      const version = '1.0.0'
      const packageId = 'myPackage'
      const slug = 'mySlug'

      const beforeInternalDocumentId = createComparisonInternalDocumentId(
        version,
        packageId,
        slug,
        '',
        '',
        '',
      )
      const afterInternalDocumentId = createComparisonInternalDocumentId(
        '',
        '',
        '',
        version,
        packageId,
        slug,
      )

      expect(beforeInternalDocumentId).not.toEqual(afterInternalDocumentId)
    })
  })

  describe('OAS tests', () => {
    runCommonPreProcessedChangelogDocumentsTests(
      'comparison-internal-documents/case2',
      'before_v1_comparison-internal-documents_case2_after_v2_comparison-internal-documents_case2',
    )

    it('should have comparison internal document data for add operation', async () => {
      await checkComparisonInternalDocumentIdExist(
        'changelog/add-operation',
        'before_v1_changelog_add-operation_after_v2_changelog_add-operation',
      )
    })

    it('should have comparison internal document data for change inside operation', async () => {
      await checkComparisonInternalDocumentIdExist(
        'changelog/change-inside-operation',
        'before_v1_changelog_change-inside-operation_after_v2_changelog_change-inside-operation',
      )
    })

    it('should have comparison internal document data for operation changes fields', async () => {
      await checkComparisonInternalDocumentIdExist(
        'changelog/operation-changes-fields',
        'before_v1_changelog_operation-changes-fields_after_v2_changelog_operation-changes-fields',
      )
    })

    it('should have comparison internal document data for remove operation', async () => {
      await checkComparisonInternalDocumentIdExist(
        'changelog/remove-operation',
        'before_v1_changelog_remove-operation_after_v2_changelog_remove-operation',
      )
    })
  })

  describe('Graphql tests', () => {
    runCommonPreProcessedChangelogDocumentsTests(
      'comparison-internal-documents/case1',
      'before_v1_comparison-internal-documents_case1_after_v2_comparison-internal-documents_case1',
      true,
    )

    it('should have comparison internal document data for add operation', async () => {
      await checkComparisonInternalDocumentIdExist(
        'graphql-changes/add-operation',
        'before_v1_graphql-changes_add-operation_after_v2_graphql-changes_add-operation',
        true,
      )
    })

    it('should have comparison internal document data for change inside operation', async () => {
      await checkComparisonInternalDocumentIdExist(
        'graphql-changes/change-inside-operation',
        'before_v1_graphql-changes_change-inside-operation_after_v2_graphql-changes_change-inside-operation',
        true,
      )
    })

    it('should have comparison internal document data for operation changes fields', async () => {
      await checkComparisonInternalDocumentIdExist(
        'graphql-changes/operation-changes-fields',
        'before_v1_graphql-changes_operation-changes-fields_after_v2_graphql-changes_operation-changes-fields',
        true,
      )
    })
    it('should have comparison internal document data for remove operation', async () => {
      await checkComparisonInternalDocumentIdExist(
        'graphql-changes/remove-operation',
        'before_v1_graphql-changes_remove-operation_after_v2_graphql-changes_remove-operation',
        true,
      )
    })
  })

  describe('Dashboards tests', () => {
    async function buildChangelogLinkedDashboards(
      packageId1: string,
      packageId2: string,
    ): Promise<BuildResult> {
      const AFTER_VERSION_ID = 'v1'
      const BEFORE_VERSION_ID = 'v2'
      const dashboardPackageId1 = 'dashboards/dashboard1'
      const dashboardPackageId2 = 'dashboards/dashboard2'
      const filesBefore: BuildConfigFile[] = [{ fileId: 'v1.yaml' }]
      const filesAfter: BuildConfigFile[] = [{ fileId: 'v2.yaml' }]

      const pkg1 = LocalRegistry.openPackage(packageId1)
      await pkg1.publish(pkg1.packageId, {
        packageId: pkg1.packageId,
        version: BEFORE_VERSION_ID,
        files: filesBefore,
      })

      await pkg1.publish(pkg1.packageId, {
        packageId: pkg1.packageId,
        version: AFTER_VERSION_ID,
        previousVersion: BEFORE_VERSION_ID,
        files: filesAfter,
      })

      const pkg2 = LocalRegistry.openPackage(packageId2)
      await pkg2.publish(pkg2.packageId, {
        packageId: pkg2.packageId,
        version: BEFORE_VERSION_ID,
        files: filesBefore,
      })

      await pkg2.publish(pkg2.packageId, {
        packageId: pkg2.packageId,
        version: AFTER_VERSION_ID,
        previousVersion: BEFORE_VERSION_ID,
        files: filesAfter,
      })

      const dashboard1 = LocalRegistry.openPackage(dashboardPackageId1)
      await dashboard1.publish(dashboard1.packageId, {
        packageId: dashboardPackageId1,
        version: BEFORE_VERSION_ID,
        apiType: 'rest',
        refs: [
          { refId: pkg1.packageId, version: BEFORE_VERSION_ID },
          { refId: pkg2.packageId, version: BEFORE_VERSION_ID },
        ],
      })

      const dashboard2 = LocalRegistry.openPackage(dashboardPackageId2)
      await dashboard2.publish(dashboard2.packageId, {
        packageId: dashboardPackageId2,
        version: AFTER_VERSION_ID,
        apiType: 'rest',
        previousVersion: BEFORE_VERSION_ID,
        previousVersionPackageId: dashboard1.packageId,
        refs: [
          { refId: pkg1.packageId, version: AFTER_VERSION_ID },
          { refId: pkg2.packageId, version: AFTER_VERSION_ID },
        ],
      })

      const editor = new Editor(dashboard2.packageId, {
        version: AFTER_VERSION_ID,
        packageId: dashboard2.packageId,
        previousVersionPackageId: dashboard2.packageId,
        previousVersion: BEFORE_VERSION_ID,
        buildType: BUILD_TYPE.CHANGELOG,
        status: VERSION_STATUS.RELEASE,
      })
      return await editor.run()
    }

    it('should dashboards have comparison internal data', async () => {
      const result = await buildChangelogDashboard('dashboards/pckg1', 'dashboards/pckg2')
      const { comparisons } = result
      const [comparisons1, comparisons2] = comparisons

      const [internalDocument1] = comparisons1.comparisonInternalDocuments
      const [operationChanges1] = comparisons1.data as OperationChanges[]

      expect(operationChanges1.comparisonInternalDocumentId).toEqual(internalDocument1.comparisonDocumentId)
      expect(operationChanges1['comparisonInternalDocumentId']).toEqual('v1_v1_dashboards_pckg1')

      const [internalDocument2] = comparisons2.comparisonInternalDocuments
      const [operationChanges2] = comparisons2.data as OperationChanges[]

      expect(operationChanges2.comparisonInternalDocumentId).toEqual(internalDocument2.comparisonDocumentId)
      expect(operationChanges2['comparisonInternalDocumentId']).toEqual('dashboards_pckg2_v2_v2_dashboards_pckg2')
    })

    it('should publish changelog for dashboard that contains packages that have changes and the same document names and versions', async () => {
      const result = await buildChangelogLinkedDashboards('dashboards/pckg1', 'dashboards/pckg2')

      const [comparisons1, comparisons2] = result.comparisons
      const dashboardsComparisonDocumentId1 = comparisons1.comparisonInternalDocuments['0'].comparisonDocumentId
      const dashboardsComparisonDocumentId2 = comparisons2.comparisonInternalDocuments['0'].comparisonDocumentId

      expect(dashboardsComparisonDocumentId1).not.toEqual(dashboardsComparisonDocumentId2)
    })
  })

  // Checking for the existence of comparison internal document fields
  async function checkComparisonInternalDocumentIdExist(packageId: string, comparisonInternalDocumentId: string, isGraphql: boolean = false): Promise<void> {
    const result = isGraphql
      ? await buildGqlChangelogPackage(packageId)
      : await buildChangelogPackage(packageId)

    const { comparisons } = result
    const [comparison] = comparisons
    const { data } = comparison
    const [operationChanges] = data as OperationChanges[]

    expect(comparison.comparisonInternalDocuments).not.toBeNull()
    const [document] = comparison.comparisonInternalDocuments
    expect(document.comparisonDocumentId).not.toBeNull()
    expect(document.serializedComparisonDocument).not.toBeNull()
    expect(document.comparisonFileId).not.toBeNull()

    expect(operationChanges).toHaveProperty('comparisonInternalDocumentId')
    expect(operationChanges['comparisonInternalDocumentId']).toEqual(comparisonInternalDocumentId)
  }

  // Checking the correctness of the filling comparison internal document data
  async function runCommonPreProcessedChangelogDocumentsTests(packageId: string, comparisonInternalDocumentId: string, isGraphql: boolean = false): Promise<void> {
    it('should comparisons have comparisonInternalDocuments', async () => {
      const result = isGraphql
        ? await buildGqlChangelogPackage(packageId)
        : await buildChangelogPackage(packageId)

      const { comparisons } = result

      const expectedComparisonFile = await loadFileAsString(
        DEFAULT_PROJECTS_PATH,
        packageId,
        'comparison.json',
      )

      comparisons.forEach(comparison => {
        const [document] = comparison.comparisonInternalDocuments
        expect(document.comparisonDocumentId).toEqual(comparisonInternalDocumentId)
        expect(JSON.parse(document.serializedComparisonDocument)).toEqual(JSON.parse(expectedComparisonFile as string))
        expect(document).toHaveProperty('comparisonFileId')
      })
    })

    it('should comparisons have comparisonInternalDocumentId', async () => {
      const result = isGraphql ? await buildGqlChangelogPackage(packageId) : await buildChangelogPackage(packageId)
      const { comparisons } = result

      comparisons.forEach(comparison => {
        const { data } = comparison
        expect(data).not.toBeNull()
        data && data.forEach(operationChanges => {
          expect(operationChanges).toHaveProperty('comparisonInternalDocumentId')
          expect(operationChanges['comparisonInternalDocumentId']).toEqual(comparisonInternalDocumentId)
        })
      })
    })

    it('should document comparisonFileId match to comparison comparisonFileId', async () => {
      const result = isGraphql ? await buildGqlChangelogPackage(packageId) : await buildChangelogPackage(packageId)
      const { comparisons } = result

      comparisons.forEach(comparison => {
        const { comparisonFileId, comparisonInternalDocuments } = comparison
        const [document] = comparisonInternalDocuments

        expect(document.comparisonFileId).toBe(comparisonFileId)
      })
    })

    it('should comparisonId in operation match to comparison document id', async () => {
      const result = isGraphql ? await buildGqlChangelogPackage(packageId) : await buildChangelogPackage(packageId)
      const { comparisons } = result

      comparisons.forEach(comparison => {
        const { data, comparisonInternalDocuments } = comparison
        const [document] = comparisonInternalDocuments

        expect(data).not.toBeNull()
        data && data.forEach(operationChanges => {
          expect(operationChanges['comparisonInternalDocumentId']).toEqual(document.comparisonDocumentId)
        })
      })
    })
  }
})
