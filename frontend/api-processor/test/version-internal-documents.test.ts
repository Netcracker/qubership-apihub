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

import { buildPackage, DEFAULT_PROJECTS_PATH, loadFileAsString, VERSIONS_PATH } from './helpers'
import { ApiOperation, PACKAGE, PackageOperation, PackageOperations, VersionDocument } from '../src'

describe('Version Internal Documents tests', () => {
  describe('OAS tests', () => {
    describe('Single OAS', () => {
      const packageId = 'version-internal-documents/oas'

      runCommonTests(packageId)
    })

    describe('Several OAS', () => {
      const packageId = 'version-internal-documents/several-oas'

      runSeveralTests(packageId)
    })
  })

  describe('Graphql tests', () => {
    describe('Single Graphql', () => {
      const packageId = 'version-internal-documents/graphql'

      runCommonTests(packageId)
    })

    describe('Several Graphql', () => {
      const packageId = 'version-internal-documents/several-graphql'

      runSeveralTests(packageId)
    })
  })

  async function runCommonTests(packageId: string): Promise<void> {
    test('should document had internalDocumentId ', async () => {
      const result = await buildPackage(packageId)
      const document: VersionDocument = result.documents.values().next().value
      expect(document.internalDocumentId).toEqual('spec')
    })

    test('should operation had versionInternalDocumentId', async () => {
      const result = await buildPackage(packageId)
      const operation: ApiOperation = result.operations.values().next().value
      expect(operation.versionInternalDocumentId).toEqual('spec')
    })

    test('should operation from file had versionInternalDocumentId', async () => {
      await buildPackage(packageId)
      const operationsFile = await loadFileAsString(
        VERSIONS_PATH,
        `${packageId}/v1`,
        PACKAGE.OPERATIONS_FILE_NAME,
      )
      if (!operationsFile) {
        throw new Error(`Cannot load ${PACKAGE.OPERATIONS_FILE_NAME}`)
      }
      const operations: PackageOperations = JSON.parse(operationsFile)
      const operation: PackageOperation = operations.operations.values().next().value
      expect(operation.versionInternalDocumentId).toEqual('spec')
    })

    test('should version-internal-documents.json had documents info', async () => {
      await buildPackage(packageId)
      const versionInternalDocumentsFile = await loadFileAsString(
        VERSIONS_PATH,
        `${packageId}/v1`,
        PACKAGE.VERSION_INTERNAL_FILE_NAME,
      )
      const expectedVersionInternalDocumentsFile = await loadFileAsString(
        DEFAULT_PROJECTS_PATH,
        packageId,
        PACKAGE.VERSION_INTERNAL_FILE_NAME,
      )
      if (!expectedVersionInternalDocumentsFile || !versionInternalDocumentsFile) {
        throw new Error(`Cannot load ${PACKAGE.VERSION_INTERNAL_FILE_NAME}`)
      }
      expect(JSON.parse(versionInternalDocumentsFile)).toEqual(JSON.parse(expectedVersionInternalDocumentsFile))
    })

    test('should internal document had serialize data', async () => {
      const result = await buildPackage(packageId)
      const document: VersionDocument = result.documents.values().next().value
      const { internalDocument } = document
      const expectedDocument = await loadFileAsString(
        DEFAULT_PROJECTS_PATH,
        packageId,
        'version-spec.json',
      )
      expect(internalDocument).toEqual(expectedDocument)
    })
  }

  async function runSeveralTests(packageId: string): Promise<void> {
    test('should documents have internal document id ', async () => {
      const result = await buildPackage(packageId)
      const [document1, document2]: VersionDocument[] = Array.from(result.documents.values())
      expect(document1.internalDocumentId).toEqual('spec1')
      expect(document2.internalDocumentId).toEqual('spec2')
    })

    test('should operations have versionInternalDocumentId', async () => {
      const result = await buildPackage(packageId)
      const [operation1, operation2]: ApiOperation[] = Array.from(result.operations.values())
      expect(operation1.versionInternalDocumentId).toEqual('spec1')
      expect(operation2.versionInternalDocumentId).toEqual('spec2')
    })

    test('should operations from file have versionInternalDocumentId', async () => {
      await buildPackage(packageId)
      const operationsFile = await loadFileAsString(
        VERSIONS_PATH,
        `${packageId}/v1`,
        PACKAGE.OPERATIONS_FILE_NAME,
      )
      if (!operationsFile) {
        throw new Error(`Cannot load ${PACKAGE.OPERATIONS_FILE_NAME}`)
      }
      const operations: PackageOperations = JSON.parse(operationsFile)
      const [operation1, operation2]: PackageOperation[] = Array.from(operations.operations.values())
      expect(operation1.versionInternalDocumentId).toEqual('spec1')
      expect(operation2.versionInternalDocumentId).toEqual('spec2')
    })

    test('should version-internal-documents.json had documents info', async () => {
      await buildPackage(packageId)
      const versionInternalDocumentsFile = await loadFileAsString(
        VERSIONS_PATH,
        `${packageId}/v1`,
        PACKAGE.VERSION_INTERNAL_FILE_NAME,
      )
      const expectedVersionInternalDocumentsFile = await loadFileAsString(
        DEFAULT_PROJECTS_PATH,
        packageId,
        PACKAGE.VERSION_INTERNAL_FILE_NAME,
      )
      if (!expectedVersionInternalDocumentsFile || !versionInternalDocumentsFile) {
        throw new Error(`Cannot load ${PACKAGE.VERSION_INTERNAL_FILE_NAME}`)
      }
      expect(JSON.parse(versionInternalDocumentsFile)).toEqual(JSON.parse(expectedVersionInternalDocumentsFile))
    })

    test('should internal document had serialize data', async () => {
      const result = await buildPackage(packageId)
      const [document1, document2]: VersionDocument[] = Array.from(result.documents.values())
      const { internalDocument: internalDocument1 } = document1
      const { internalDocument: internalDocument2 } = document2
      const [versionSpec1, versionSpec2] = await Promise.all([loadFileAsString(
        DEFAULT_PROJECTS_PATH,
        packageId,
        'version-spec1.json',
      ), loadFileAsString(
        DEFAULT_PROJECTS_PATH,
        packageId,
        'version-spec2.json',
      )])
      expect(internalDocument1).toEqual(versionSpec1)
      expect(internalDocument2).toEqual(versionSpec2)
    })
  }
})
