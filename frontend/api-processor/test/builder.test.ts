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

import { BUILD_TYPE, VERSION_STATUS } from '../src'
import { Editor, LocalRegistry } from './helpers'

const basicPackage = LocalRegistry.openPackage('basic')
const apiAudiencePackage = LocalRegistry.openPackage('api-audience')

describe('Editor scenarios', () => {
  describe('Update version', () => {
    test('clean cache and change version', async () => {
      const editor = await Editor.openProject('basic', basicPackage)
      const result = await editor.run({ version: 'v3' })
      const resultUpdate = await editor.update(
        { version: 'v4' },
        [],
        { cleanCache: true },
      )

      const expectConfig = {
        ...result.config,
        version: 'v4',
      }
      expect(expectConfig).toMatchObject(resultUpdate.config)
    })
  })

  describe('APIHUB: path with parameters', () => {
    test('build result should include only rest operations with inlined parameters', async () => {
      const editor = await Editor.openProject('apihub')
      const result = await editor.run({ version: 'v1' })

      const operations = [...result.operations.values()]

      expect(operations.some(({ operationId }) => operationId.endsWith('-parameters'))).toEqual(false)
      expect(operations.every(({ title }) => title)).toEqual(true)
      expect(operations.every(({ searchScopes }) => searchScopes && Object.keys(searchScopes).length > 0)).toEqual(true)
    })

    test('document has info and externalDocs', async () => {
      const editor = await Editor.openProject('apihub')
      const result = await editor.run({
        version: 'v1',
        files: [
          {
            fileId: 'docs/API-HUB_09.03.22.yaml',
            publish: true,
            labels: [
              '123',
            ],
            commitId: 'k123jkqlwe1',
          },
          {
            fileId: 'OpenApi 3.1.yaml',
            publish: true,
            labels: [
              '444',
            ],
            commitId: 'k123jkqlwe2',
          },
          {
            fileId: 'Swagger 2.0.yaml',
            publish: true,
            labels: [
              '4444',
            ],
            commitId: 'k123jkqlwe25',
          },
        ],
      })

      const document = result.documents.get('docs/API-HUB_09.03.22.yaml')
      expect(document?.title).toBeDefined()
      expect(document?.description).toBeDefined()
      expect(document?.version).toBeDefined()
      expect((document?.metadata as any).info).toBeDefined()
      expect((document?.metadata as any).externalDocs).toBeDefined()
    })
  })

  describe('AGENT test cases', () => {
    test('build result should include only rest operations with inlined parameters', async () => {
      const editor = await Editor.openProject('agent')
      const result = await editor.run({ version: 'v1' })

      const documents = [...result.documents.values()]
      const operations = [...result.operations.values()]

      expect(documents.every(({ slug }) => slug)).toEqual(true)
      expect(operations.every(({ title }) => title)).toEqual(true)
      expect(operations.every(({ searchScopes }) => searchScopes && Object.keys(searchScopes).length > 0)).toEqual(true)
    })
  })

  describe('api audience test', () => {
    test('сomparison must have two type of api audience transition with 3 operations', async () => {
      await apiAudiencePackage.publish('api-audience', {
        packageId: 'api-audience',
        version: 'v1',
        files: [{ fileId: 'spec-1-v1.yaml' }, { fileId: 'spec-2-v1.yaml' }],
      })
      await apiAudiencePackage.publish('api-audience', {
        packageId: 'api-audience',
        version: 'v2',
        previousVersion: 'v1',
        files: [{ fileId: 'spec-1-v2.yaml' }, { fileId: 'spec-2-v2.yaml' }],
      })

      const editor = new Editor('api-audience', {
        packageId: 'api-audience',
        version: 'v2',
        previousVersion: 'v1',
        status: VERSION_STATUS.RELEASE,
        files: [{ fileId: 'spec-1-v2.yaml' }, { fileId: 'spec-2-v2.yaml' }],
      }, {}, apiAudiencePackage)

      const result = await editor.run()
      const [{ operationTypes: [{ apiAudienceTransitions }] }] = result.comparisons
      expect(apiAudienceTransitions.length).toBe(2)
      const [firstTransition, secondTransition] = apiAudienceTransitions
      expect(firstTransition).toEqual({
        currentAudience: 'internal',
        previousAudience: 'external',
        operationsCount: 3,
      })
      expect(secondTransition).toEqual({
        currentAudience: 'external',
        previousAudience: 'unknown',
        operationsCount: 3,
      })
    })
  })
})
