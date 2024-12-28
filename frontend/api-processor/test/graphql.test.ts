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

let pkg: LocalRegistry
const PACKAGE_ID = 'graphql'

describe('GraphQL test', () => {
  beforeAll(async () => {
    pkg = LocalRegistry.openPackage(PACKAGE_ID)
    await pkg.publish(pkg.packageId, {
      version: 'v1',
      packageId: pkg.packageId,
    })
    await pkg.publish(pkg.packageId, {
      version: 'v2',
      previousVersion: 'v1',
      packageId: pkg.packageId,
    })
  })

  test('should have operations from GraphQL documents', async () => {
    const editor = await Editor.openProject(PACKAGE_ID, pkg)
    const result = await editor.run({
      packageId: PACKAGE_ID,
      version: 'graphql',
      files: [
        {fileId: 'spec.gql'},
      ],
    })

    expect(result.operations.size).toBeTruthy()
  })

  test('should have changes with human-readable descriptions', async () => {
    const editor = await Editor.openProject(PACKAGE_ID, pkg)
    const result = await editor.run({
      packageId: PACKAGE_ID,
      version: 'v2',
      previousVersion: 'v1',
      files: [
        {fileId: 'spec1.graphql'},
      ],
    })

    const changes = result.comparisons[0].data?.flatMap(data => data.changes)

    expect(changes?.length).toBeTruthy()
    expect(changes?.every(change => change?.description)).toBeTruthy()
    //TODO BAD PERFORMANCE!
  }, 200000)
})
