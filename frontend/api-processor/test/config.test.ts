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

import { Editor, LocalRegistry } from './helpers'

const basicPackage = LocalRegistry.openPackage('basic')

describe('Config validation', () => {
  describe('Config output', () => {
    test('Openapi metadata: title and tags', async () => {
      const tags = ['tag1', 'tag2']
      const title = 'Title for /pets and method get'

      const editor = await Editor.openProject('basic')
      await editor.run({version: 'v1'})

      await editor.updateJsonFile('openapi.json', (data) => {
        data.paths['/pets'].get.tags = tags
        data.paths['/pets'].get.summary = title
        return data
      })

      const result = await editor.update(editor.config, 'openapi.json')

      expect(result.operations.get('api-pets-get')?.tags.join()).toEqual(tags.join())

      expect(Array.from(result.operations.values()).map(({ metadata }) => metadata)).toEqual(
        expect.toIncludeSameMembers([
          expect.objectContaining({ path: '/api/pets', originalPath: '/api/pets', method: 'get' }),
          expect.objectContaining({ path: '/api/pets', originalPath: '/api/pets', method: 'post' }),
          expect.objectContaining({ path: '/api/pets/*', originalPath: '/api/pets/{id}', method: 'delete' }),
        ]),
      )
    })
  })

  describe('Config input', () => {
    test('no set packageId field', async () => {
      const editor = await Editor.openProject('basic', basicPackage)
      await expect(
        editor.run({packageId: undefined, version: 'v3'}),
      ).rejects.toThrowError('builder config: packageId required')

    })

    test('no set version field', async () => {
      const editor = await Editor.openProject('basic', basicPackage)
      await expect(
        editor.run({version: undefined}),
      ).rejects.toThrowError('builder config: version required')
    })

    test('fileId is empty', async () => {
      const editor = await Editor.openProject('basic', basicPackage)
      const result = await editor.run({version: 'v3', files: [{fileId: '', publish: true, labels: []}]})

      expect(result.documents.size).toBe(0)
    })
  })
})
