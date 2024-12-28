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

const brokenPackage = LocalRegistry.openPackage('broken')

describe('Basic project (one file): validation broken', () => {
  describe('JSON format', () => {
    test('JSON content in YAML-extension file', async () => {
      const editor = await Editor.openProject('broken', brokenPackage)
      const result = await editor.run({ files: [{ fileId: 'openapi.yaml', publish: true, labels: [] }] })

      expect(result.documents.get('openapi.yaml')?.type).toBe('openapi-3-0')
    })

    test('missing quote', async () => {
      const editor = await Editor.openProject('broken', brokenPackage)
      await expect(
        async () => await editor.run({ files: [{ fileId: 'missing_quote.json', publish: true, labels: [] }] }),
      ).rejects.toThrow('Cannot parse file missing_quote.json.')
    })

    test('missing comma', async () => {
      const editor = await Editor.openProject('broken', brokenPackage)
      await expect(
        async () => await editor.run({ files: [{ fileId: 'missing_comma.json', publish: true, labels: [] }] }),
      ).rejects.toThrow('Cannot parse file missing_comma.json.')
    })

    test('missing brace', async () => {
      const editor = await Editor.openProject('broken', brokenPackage)
      await expect(
        async () => await editor.run({ files: [{ fileId: 'missing_brace.json', publish: true, labels: [] }] }),
      ).rejects.toThrow('Cannot parse file missing_brace.json.')
    })

    test('missing bracket', async () => {
      const editor = await Editor.openProject('broken', brokenPackage)
      await expect(
        async () => await editor.run({ files: [{ fileId: 'missing_bracket.json', publish: true, labels: [] }] }),
      ).rejects.toThrow('Cannot parse file missing_bracket.json.')
    })
  })

  describe('YAML format', () => {
    test('missing quote', async () => {
      const editor = await Editor.openProject('broken', brokenPackage)
      await expect(
        async () => await editor.run({ files: [{ fileId: 'missing_quote.yaml', publish: true, labels: [] }] }),
      ).rejects.toThrow('Cannot parse file missing_quote.yaml.')
    })

    test('missing dash', async () => {
      const editor = await Editor.openProject('broken', brokenPackage)
      await expect(
        async () => await editor.run({ files: [{ fileId: 'missing_dash.yaml', publish: true, labels: [] }] }),
      ).rejects.toThrow('Cannot parse file missing_dash.yaml.')
    })

    test('duplicate keys', async () => {
      const editor = await Editor.openProject('broken', brokenPackage)
      await expect(
        async () => await editor.run({ files: [{ fileId: 'apihub-api-5 (1).yml', publish: true, labels: [] }] }),
      ).rejects.toThrow('Cannot parse file apihub-api-5 (1).yml.')
    })

    test('a key of node is missing', async () => {
      const editor = await Editor.openProject('broken', brokenPackage)
      await expect(
        async () => await editor.run({ files: [{ fileId: 'OpenApi 3.0.yaml', publish: true, labels: [] }] }),
      ).rejects.toThrow('Cannot parse file OpenApi 3.0.yaml.')
    })

    test('openapi-2', async () => {
      const editor = await Editor.openProject('broken', brokenPackage)
      await expect(
        async () => await editor.run({ files: [{ fileId: 'OpenApi 3.0-2.yaml', publish: true, labels: [] }] }),
      ).rejects.toThrow('Cannot parse file OpenApi 3.0-2.yaml.')
    })
  })
})
