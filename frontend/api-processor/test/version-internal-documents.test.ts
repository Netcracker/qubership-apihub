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
import { ApiOperation, PACKAGE, PackageOperations, VersionDocument } from '../src'

const DOCUMENT_FILE_NAME = 'spec'
const SINGLE_FILE_NAMES = [DOCUMENT_FILE_NAME]

const DOCUMENT_FILE_1_NAME = 'spec1'
const DOCUMENT_FILE_2_NAME = 'spec2'
const SEVERAL_FILES_NAME = [DOCUMENT_FILE_1_NAME, DOCUMENT_FILE_2_NAME]

describe('Version Internal Documents tests', () => {
  describe('OAS tests', () => {
    describe('Single OAS', () => {
      const packageId = 'version-internal-documents/oas'

      runCommonTests(packageId, SINGLE_FILE_NAMES)
    })

    describe('Several OAS', () => {
      const packageId = 'version-internal-documents/several-oas'
      runCommonTests(packageId, SEVERAL_FILES_NAME)
    })

    it('should not create internalDocument without publish', async ()=> {
      const packageId = 'version-internal-documents/oas-no-publish'
      const result = await buildPackage(packageId)

      const [document] = Array.from(result.documents.values())

      expect(document.internalDocument).not.toBeExtensible()
    })

    it('should not create internalDocument without operations', async ()=> {
      const packageId = 'version-internal-documents/oas-without-operations'
      const result = await buildPackage(packageId)

      const [document] = Array.from(result.documents.values())

      expect(document.internalDocument).not.toBeExtensible()
    })
  })

  describe('Graphql tests', () => {
    describe('Single Graphql', () => {
      const packageId = 'version-internal-documents/graphql'

      runCommonTests(packageId, SINGLE_FILE_NAMES)
    })

    describe('Several Graphql', () => {
      const packageId = 'version-internal-documents/several-graphql'
      runCommonTests(packageId, SEVERAL_FILES_NAME)
    })
  })

  async function runCommonTests(packageId: string, files: string[]): Promise<void> {
    test('should documents have internalDocumentId', async () => {
      const result = await buildPackage(packageId)
      const documents: VersionDocument[] = Array.from(result.documents.values())
      Array.from(documents).forEach((document, i)=> {
        expect(document.internalDocumentId).toEqual(files[i])
      })
    })

    test('should operations have versionInternalDocumentId', async () => {
      const result = await buildPackage(packageId)
      const operations: ApiOperation[] = Array.from(result.operations.values())
      Array.from(operations).forEach((operation, i)=> {
        expect(operation.versionInternalDocumentId).toEqual(files[i])
      })
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
      const packageOperations: PackageOperations = JSON.parse(operationsFile)
      Array.from(packageOperations.operations).forEach((operation, i)=> {
        expect(operation.versionInternalDocumentId).toEqual(files[i])
      })
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
      const documents: VersionDocument[] = Array.from(result.documents.values())
      const versionSpecs = await Promise.all(
        files.map(item =>
          loadFileAsString(DEFAULT_PROJECTS_PATH, packageId, `version-${item}.json`),
        ),
      )
      documents.forEach((document, i)=> {
        expect(document.internalDocument).toEqual(versionSpecs[i])
      })
    })
  }
})
