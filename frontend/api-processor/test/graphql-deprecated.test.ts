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
import { BUILD_TYPE, VERSION_STATUS } from '../src'

const portal = LocalRegistry.openPackage('new-deprecated')

describe('GraphQL Deprecated Items test', () => {
  const packageId = 'new-deprecated-graphapi'
  test('should build deprecated items', async () => {
    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      status: VERSION_STATUS.RELEASE,
      files: [{ fileId: 'simple-graphQL-2.gql' }],
      buildType: BUILD_TYPE.BUILD,
    }, {}, portal)

    const result = await editor.run()

    const deprecatedItems = Array.from(result.operations.values()).flatMap(operation => operation.deprecatedItems)

    expect(deprecatedItems.length === 1).toBeTruthy()
  })
})
