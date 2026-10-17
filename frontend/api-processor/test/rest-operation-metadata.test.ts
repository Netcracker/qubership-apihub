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

import { buildPackageFromContent, cloneDocument, Editor, expectNotEmpty, operationOf } from './helpers'

describe('Operation metadata test', () => {
  test('custom tag should exist in operation if provided in operationData', async () => {
    const result = await buildPackageFromContent('custom-tags/operation-shapes', 'openapi.yaml', `openapi: 3.0.0
info:
  title: Operation tags
  version: '1.0'
paths:
  /string:
    get:
      x-operation-meta: Custom tag exists
      responses:
        '200':
          description: OK
  /object:
    get:
      x-operation-meta:
        message: Custom tag can contain objects too
      responses:
        '200':
          description: OK
  /array:
    get:
      x-operation-meta:
        - There can be arrays passed too
      responses:
        '200':
          description: OK
`)

    // cloned: a value parsed from the document carries a symbol-keyed record of where it came from
    const customTagsOf = (operationId: string): unknown =>
      cloneDocument(operationOf(result, operationId).metadata.customTags)
    expect(customTagsOf('string-get')).toEqual({ 'x-operation-meta': 'Custom tag exists' })
    expect(customTagsOf('object-get'))
      .toEqual({ 'x-operation-meta': { message: 'Custom tag can contain objects too' } })
    expect(customTagsOf('array-get')).toEqual({ 'x-operation-meta': ['There can be arrays passed too'] })
  })

  test('operationIdV1 should exist in operation metadata', async () => {
    const editor = await Editor.openProject('rest-operation/metadata')
    const result = await editor.run({
      version: 'v1',
      packageId: 'metadata',
    })

    const operation = operationOf(result, 'test-_id_--get')

    expect(operation.metadata.operationIdV1).toBeDefined()
    expect(typeof operation.metadata.operationIdV1).toBe('string')
    expectNotEmpty(operation.metadata.operationIdV1)
  })

  // the proof mutation hands the document root to `getCustomTags`: it adds a wrong call rather than breaking an
  // existing one, so it shows this can fail, not that it catches a likely regression
  test('custom tag at the document root should not reach the operation', async () => {
    const result = await buildPackageFromContent('custom-tags/document-root', 'openapi.yaml', `openapi: 3.0.0
info:
  title: Root tag
  version: '1.0'
x-custom-tag: root
paths:
  /pet:
    get:
      responses:
        '200':
          description: OK
`)

    expect(operationOf(result, 'pet-get').metadata.customTags).toEqual({})
  })
})
