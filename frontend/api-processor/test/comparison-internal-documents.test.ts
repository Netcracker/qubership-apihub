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
  loadFileAsString,
} from './helpers'
import { OperationChanges } from '../src'

describe('Comparison Internal Documents tests', () => {

  describe('OAS tests', () => {
    runCommonPreProcessedChangelogDocumentsTests('comparison-internal-documents/case2')

    it('should have comparison internal document data for add operation', async () => {
      await checkComparisonInternalDocumentIdExist('changelog/add-operation')
    })

    it('should have comparison internal document data for change inside operation', async () => {
      await checkComparisonInternalDocumentIdExist('changelog/change-inside-operation')
    })

    it('should have comparison internal document data for operation changes fields', async () => {
      await checkComparisonInternalDocumentIdExist('changelog/operation-changes-fields')
    })

    it('should have comparison internal document data for remove operation', async () => {
      await checkComparisonInternalDocumentIdExist('changelog/remove-operation')
    })
  })

  describe('Graphql tests', () => {
    runCommonPreProcessedChangelogDocumentsTests('comparison-internal-documents/case1', true)

    it('should have comparison internal document data for add operation', async () => {
      await checkComparisonInternalDocumentIdExist('graphql-changes/add-operation', true)
    })

    it('should have comparison internal document data for change inside operation', async () => {
      await checkComparisonInternalDocumentIdExist('graphql-changes/change-inside-operation', true)
    })

    it('should have comparison internal document data for operation changes fields', async () => {
      await checkComparisonInternalDocumentIdExist('graphql-changes/operation-changes-fields', true)
    })
    it('should have comparison internal document data for remove operation', async () => {
      await checkComparisonInternalDocumentIdExist('graphql-changes/remove-operation', true)
    })
  })

  describe('Dashboards tests', () => {
    it('should dashboards have comparison internal data', async () => {
      const result = await buildChangelogDashboard('dashboards/pckg1', 'dashboards/pckg2')
      const { comparisons } = result
      comparisons.forEach(comparison => {
        if (!comparison.data) {
          return
        }
        const { data } = comparison
        const [operationChanges] = data as OperationChanges[]

        expect(comparison.comparisonInternalDocuments).not.toBeNull()
        const [document] = comparison.comparisonInternalDocuments
        expect(document.id).not.toBeNull()
        expect(document.value).not.toBeNull()
        expect(document.comparisonFileId).not.toBeNull()

        expect(operationChanges).toHaveProperty('comparisonInternalDocumentId')
        expect(operationChanges).not.toBeEmpty()
      })
    })
  })

  // Checking for the existence of comparison internal document fields
  async function checkComparisonInternalDocumentIdExist(packageId: string, isGraphql: boolean = false): Promise<void> {
    const result = isGraphql
      ? await buildGqlChangelogPackage(packageId)
      : await buildChangelogPackage(packageId)

    const { comparisons } = result
    const [comparison] = comparisons
    const { data } = comparison
    const [operationChanges] = data as OperationChanges[]

    expect(comparison.comparisonInternalDocuments).not.toBeNull()
    const [document] = comparison.comparisonInternalDocuments
    expect(document.id).not.toBeNull()
    expect(document.value).not.toBeNull()
    expect(document.comparisonFileId).not.toBeNull()

    expect(operationChanges).toHaveProperty('comparisonInternalDocumentId')
    expect(operationChanges['comparisonInternalDocumentId']).toEqual('before_v1_after_v2')
  }

  // Checking the correctness of the filling comparison internal document data
  async function runCommonPreProcessedChangelogDocumentsTests(packageId: string, isGraphql: boolean = false): Promise<void> {
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
        expect(document.id).toEqual('before_v1_after_v2')
        expect(document.value).toEqual(expectedComparisonFile)
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
          expect(operationChanges['comparisonInternalDocumentId']).toEqual('before_v1_after_v2')
        })
      })
    })
  }
})

