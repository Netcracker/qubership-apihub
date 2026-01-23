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

import { OpenAPIV3 } from 'openapi-types'
import { createSingleOperationSpec } from '../src/apitypes/rest/rest.operation'

import { describe, test, expect } from '@jest/globals'
import * as fs from 'fs/promises'
import * as path from 'path'
import YAML from 'js-yaml'
import { securitySchemesFromRequirementsMatcher } from './helpers/matchers'
import { RestOperationData } from '../src/apitypes/rest/rest.types'

// Helper function to load YAML test files
const loadYamlFile = async (relativePath: string): Promise<OpenAPIV3.Document> => {
  const filePath = path.join(process.cwd(), 'test/projects', relativePath)
  const content = await fs.readFile(filePath, 'utf8')
  return YAML.load(content) as OpenAPIV3.Document
}

describe('REST Operation Unit Tests', () => {
  describe('createSingleOperationSpec', () => {

    const TEST_DATA_PATH = '/test'
    const TEST_DATA_METHOD = 'get' as OpenAPIV3.HttpMethods
    const TEST_DATA_OPENAPI = '3.0.0'

    const getOperationSecurity = (document: OpenAPIV3.Document, path: string, method: OpenAPIV3.HttpMethods): OpenAPIV3.SecurityRequirementObject[] | undefined => {
      return document.paths?.[path]?.[method]?.security
    }

    const createTestSingleOperationSpec = (document: OpenAPIV3.Document): RestOperationData => {
      return createSingleOperationSpec(
        document,
        TEST_DATA_PATH,
        TEST_DATA_METHOD,
        TEST_DATA_OPENAPI,
        document.servers,
        document.security,
        getOperationSecurity(document, TEST_DATA_PATH, TEST_DATA_METHOD),
        document.components?.securitySchemes,
      )
    }

    describe('Security Scheme Filtering', () => {
      test('should include only used security schemes when operation security is defined', async () => {
        const document = await loadYamlFile('rest.operation/security-schemes-filtering-operation/base.yaml')

        const operationSecurity = getOperationSecurity(document, TEST_DATA_PATH, TEST_DATA_METHOD)

        const result = createTestSingleOperationSpec(document)

        expect(result.components?.securitySchemes).toBeDefined()
        expect(result.components!.securitySchemes!).toEqual(
          securitySchemesFromRequirementsMatcher(operationSecurity || []),
        )
      })

      test('should include only used security schemes when root security is defined but no operation security', async () => {
        const document = await loadYamlFile('rest.operation/security-schemes-filtering-root/base.yaml')

        const result = createTestSingleOperationSpec(document)

        expect(result.components?.securitySchemes).toBeDefined()
        expect(result.components!.securitySchemes!).toEqual(
          securitySchemesFromRequirementsMatcher(document.security || []),
        )
      })

      test('should not include security schemes when none are used', async () => {
        const document = await loadYamlFile('rest.operation/security-schemes-filtering-none-used/base.yaml')

        const result = createTestSingleOperationSpec(document)

        expect(result.components?.securitySchemes).toBeUndefined()
      })

      test('should handle empty root security requirements', async () => {
        const document = await loadYamlFile('rest.operation/security-schemes-filtering-empty-root/base.yaml')

        const result = createTestSingleOperationSpec(document)

        expect(result.components?.securitySchemes).toBeUndefined()
      })

      test('should handle empty operation security requirements', async () => {
        const document = await loadYamlFile('rest.operation/security-schemes-filtering-empty-operation/base.yaml')

        const result = createTestSingleOperationSpec(document)

        expect(result.components?.securitySchemes).toBeUndefined()
      })
    })

    describe('Conditional Security Handling', () => {
      test('should not include root security when operation security is explicitly defined', async () => {
        const document = await loadYamlFile('rest.operation/conditional-security-explicit/base.yaml')

        const result = createTestSingleOperationSpec(document)

        expect(result.security).toBeUndefined()
      })

      test('should include root security when no operation security is defined', async () => {
        const document = await loadYamlFile('rest.operation/security-schemes-filtering-root/base.yaml')

        const result = createTestSingleOperationSpec(document)

        expect(result.security).toEqual(document.security)
      })
    })

    describe('Info, ExternalDocs, and Tags Handling', () => {
      test('should include info object from source document', async () => {
        const document = await loadYamlFile('rest.operation/info-externaldocs-tags-filtering/base.yaml')

        const result = createTestSingleOperationSpec(document)

        expect(result.info).toBeDefined()
        expect(result.info).toEqual(document.info)
      })

      test('should include externalDocs object from source document', async () => {
        const document = await loadYamlFile('rest.operation/info-externaldocs-tags-filtering/base.yaml')

        const result = createTestSingleOperationSpec(document)

        expect(result.externalDocs).toBeDefined()
        expect(result.externalDocs).toEqual(document.externalDocs)
      })

      test('should filter tags to only include those used by the operation', async () => {
        const document = await loadYamlFile('rest.operation/info-externaldocs-tags-filtering/base.yaml')

        const result = createTestSingleOperationSpec(document)

        expect(result.tags).toEqual([
          {
            name: 'pet',
            description: 'Pet operations',
          },
        ])
      })

      test('should handle document with no tags', async () => {
        const document = await loadYamlFile('rest.operation/info-externaldocs-no-tags/base.yaml')

        const result = createTestSingleOperationSpec(document)

        expect(result.tags).toBeUndefined()
      })
    })
  })
})
