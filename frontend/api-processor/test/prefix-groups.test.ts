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

const pkg = LocalRegistry.openPackage('apihub')

describe('Prefix Groups test',  () => {
  beforeAll(async () => {
    // generate missing versions/apihub folder contents
    await pkg.publish(pkg.packageId, {
      version: 'v1',
      packageId: pkg.packageId,
      files: [
        { fileId: 'docs/API-HUB_09.03.22.yaml' },
        { fileId: 'APIHUB API.yaml' },
        { fileId: 'OpenApi 3.1.yaml' },
        { fileId: 'Public Registry API.yaml' },
        { fileId: 'Swagger 2.0.yaml' },
      ],
    })
    await pkg.publish(pkg.packageId, {
      version: 'v2',
      previousVersion: 'v1',
      packageId: pkg.packageId,
      files: [
        { fileId: 'docs/API-HUB_09.03.22.yaml' },
        { fileId: 'APIHUB API.yaml' },
        { fileId: 'OpenApi 3.1.yaml' },
        { fileId: 'Public Registry API.yaml' },
        { fileId: 'Swagger 2.0.yaml' },
      ],
    })
    await pkg.publish(pkg.packageId, {
      version: 'prefix1',
      packageId: pkg.packageId,
      files: [
        { fileId: 'APIHUB API.yaml' },
        { fileId: 'Public Registry API.yaml' },
      ],
    })
    await pkg.publish(pkg.packageId, {
      version: 'prefix2',
      previousVersion: 'v1',
      packageId: pkg.packageId,
      files: [
        { fileId: 'APIHUB API.yaml' },
        { fileId: 'Public Registry API.yaml' },
      ],
    })
  })

  test('should compare prefix groups /api/{group}, groups=v2, v3', async () => {
    const editor = await Editor.openProject(pkg.packageId, pkg)
    const result = await editor.run({
      version: 'prefix2',
      previousVersion: 'prefix1',
      currentGroup: '/api/v3',
      previousGroup: 'api/v2',
      buildType: 'prefix-groups-changelog',
    })

    expect(result.comparisons?.[0].data?.length).toBe(95)
  })
})
