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

import { jest } from '@jest/globals'
import { BUILD_TYPE, VERSION_STATUS } from '../src'
import {
  ANY_REST_CHANGE,
  cloneDocument,
  contentEditor,
  documentOf,
  Editor,
  errorNotificationsOf,
  LocalRegistry,
  operationOf,
  publishChangeFromContent,
} from './helpers'

const apiAudiencePackage = LocalRegistry.openPackage('rest-build/api-audience')

describe('Editor scenarios', () => {
  describe('Update version', () => {
    test('clean cache and change version', async () => {
      const packageId = 'update-version/clean-cache'
      const registry = await publishChangeFromContent(packageId, ANY_REST_CHANGE)
      // the editor takes the registry's resolvers when it is created, so the spy has to be there first
      const resolveVersion = jest.spyOn(registry, 'versionResolver')
      const editor = contentEditor(
        { packageId, version: 'v3', previousVersion: 'v1', buildType: BUILD_TYPE.BUILD },
        { 'after.yaml': ANY_REST_CHANGE.after },
        registry,
      )
      const result = await editor.run({ version: 'v3' })
      resolveVersion.mockClear()

      // a changed file makes the update compare again; the previous version comes from the version cache unless
      // the update cleans it
      const resultUpdate = await editor.update(
        { version: 'v4' },
        ['after.yaml'],
        { cleanCache: true },
      )

      expect(resolveVersion).toHaveBeenCalledWith(packageId, 'v1', true)
      const expectConfig = {
        ...result.config,
        version: 'v4',
      }
      // checks only the keys the updated config keeps
      expect(expectConfig).toMatchObject(resultUpdate.config)
    })
  })

  // the unifier lifts path item fields into each operation before the operations are built, so `parameters`
  // and extensions on the path item must not become operations, and a method without a summary takes the path's
  describe('Path item fields', () => {
    test.each(['3.0.3', '3.1.0'])('should build only the methods of a path item in OpenAPI %s', async (openapi) => {
      // a draft, so a build error is reported rather than thrown
      const result = await contentEditor({ packageId: `rest-build/path-item-fields/${openapi}`, version: 'v1' }, {
        'openapi.yaml': `openapi: ${openapi}
info:
  title: Path item fields
  version: '1.0'
paths:
  /pets/{id}:
    summary: Path summary
    description: Path description
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    x-path-extension: kept
    get:
      responses:
        '200':
          description: OK
    post:
      summary: Own summary
      responses:
        '200':
          description: OK
`,
      }).run({ status: VERSION_STATUS.DRAFT, buildType: BUILD_TYPE.BUILD })

      // a key the build mistook for a method fails to build and is reported, rather than adding an operation
      expect(errorNotificationsOf(result.notifications)).toEqual([])
      expect([...result.operations.values()].map(({ operationId, title }) => [operationId, title])).toEqual([
        ['pets-_id_-get', 'Path summary'],
        ['pets-_id_-post', 'Own summary'],
      ])
      const { data } = operationOf(result, 'pets-_id_-get')
      expect(data?.paths?.['/pets/{id}']?.parameters?.map(({ name }: { name: string }) => name)).toEqual(['id'])
    })
  })

  describe('Document metadata', () => {
    test('document has info and externalDocs', async () => {
      // `license` keeps `metadata.info` alive: the title, description and version move out of it to the document
      const result = await contentEditor({ packageId: 'rest-build/document-info', version: 'v1' }, {
        'openapi.yaml': `openapi: 3.0.0
info:
  title: Document info
  description: A document with info and externalDocs
  version: 2.1.0
  license:
    name: MIT
externalDocs:
  url: https://example.com/docs
  description: More
paths:
  /pets:
    get:
      responses:
        '200':
          description: OK
`,
      }).run()

      const document = documentOf(result, 'openapi.yaml')
      expect(document.title).toBe('Document info')
      expect(document.description).toBe('A document with info and externalDocs')
      expect(document.version).toBe('2.1.0')
      const { info, externalDocs } = cloneDocument(document.metadata) as { info?: unknown; externalDocs?: unknown }
      expect(info).toEqual({ license: { name: 'MIT' } })
      expect(externalDocs).toEqual({ url: 'https://example.com/docs', description: 'More' })
    })
  })

  describe('api audience test', () => {
    test('comparison must have two type of api audience transition with 3 operations', async () => {
      await apiAudiencePackage.publish('rest-build/api-audience', {
        packageId: 'rest-build/api-audience',
        version: 'v1',
        files: [{ fileId: 'before1.yaml' }, { fileId: 'before2.yaml' }],
      })
      await apiAudiencePackage.publish('rest-build/api-audience', {
        packageId: 'rest-build/api-audience',
        version: 'v2',
        previousVersion: 'v1',
        files: [{ fileId: 'after1.yaml' }, { fileId: 'after2.yaml' }],
      })

      const editor = new Editor('rest-build/api-audience', {
        packageId: 'rest-build/api-audience',
        version: 'v2',
        previousVersion: 'v1',
        status: VERSION_STATUS.RELEASE,
        files: [{ fileId: 'after1.yaml' }, { fileId: 'after2.yaml' }],
        buildType: BUILD_TYPE.BUILD,
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

  describe('PathItems build', () => {
    const COMPONENTS_ITEM_1_PATH = ['components', 'pathItems', 'componentsPathItem1']
    test('should have separate operations with pathitems', async () => {
      // This fixture carries no config.json, so the build config lives here.
      const files = [{ fileId: 'spec.yaml' }]
      const pkg = LocalRegistry.openPackage('rest-build/define-path-items-via-reference-object-chain')
      const editor = await Editor.openProject(pkg.packageId, pkg)

      await pkg.publish(pkg.packageId, { packageId: pkg.packageId, version: 'v1', files })
      const result = await editor.run({
        version: 'v1',
        status: VERSION_STATUS.RELEASE,
        buildType: BUILD_TYPE.BUILD,
        files,
      })

      const resultOperations = Array.from(result.operations.values())
      expect(resultOperations.length).toEqual(2)

      const [postOperation, getOperation] = resultOperations
      // check that we have only path operation in componentsPathItem1 for path1-post
      expect(postOperation.operationId).toEqual('path1-post')
      expect(postOperation.data).toHaveProperty([...COMPONENTS_ITEM_1_PATH, 'post'])
      expect(postOperation.data).not.toHaveProperty([...COMPONENTS_ITEM_1_PATH, 'get'])

      // check that we have only get operation in componentsPathItem1 for path1-get
      expect(getOperation.operationId).toEqual('path1-get')
      expect(getOperation.data).not.toHaveProperty([...COMPONENTS_ITEM_1_PATH, 'post'])
      expect(getOperation.data).toHaveProperty([...COMPONENTS_ITEM_1_PATH, 'get'])
    })
  })
})
