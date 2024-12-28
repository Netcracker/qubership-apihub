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

import { Editor } from './helpers'

describe('Custom tag test', () => {
  test('custom tag should exist in operation if provided in operationData', async () => {
    const editor = await Editor.openProject('apihub')
    const result = await editor.run({
      version: 'v1',
      packageId: 'custom-tags',
    })

    const firstOperationWithCustomTag = result.operations.get('api-v1-integrations-gitlab-apikey-get')
    expect(firstOperationWithCustomTag!.metadata.customTags['x-operation-meta']).toEqual('Custom tag exists')
    const secondOperationWithCustomTag = result.operations.get('api-v1-integrations-gitlab-apikey-put')
    expect(JSON.stringify(secondOperationWithCustomTag!.metadata.customTags['x-operation-meta']))
      .toBe(JSON.stringify({ 'message': 'Custom tag can contain objects too' }))
    const thirdOperationWithCustomTag = result.operations.get('api-v1-integrations-integrationtype-repositories-get')
    expect(JSON.stringify(thirdOperationWithCustomTag!.metadata.customTags['x-operation-meta']))
      .toBe(JSON.stringify(['There can be arrays passed too']))
  })
})
