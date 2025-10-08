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

import {
  buildPrefixGroupChangelogPackage,
  changesSummaryMatcher,
  Editor,
  LocalRegistry,
  numberOfImpactedOperationsMatcher,
  operationChangesMatcher,
} from './helpers'
import { ANNOTATION_CHANGE_TYPE, BREAKING_CHANGE_TYPE, BUILD_TYPE, NON_BREAKING_CHANGE_TYPE } from '../src'

const pkg = LocalRegistry.openPackage('apihub')

describe('Prefix Groups test', () => {
  test('should compare prefix groups /api/{group}, groups=v2, v3', async () => {
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

    const editor = await Editor.openProject(pkg.packageId, pkg)
    const result = await editor.run({
      version: 'prefix2',
      currentGroup: '/api/v3',
      previousGroup: 'api/v2',
      buildType: BUILD_TYPE.PREFIX_GROUPS_CHANGELOG,
    })

    expect(result.comparisons?.[0].data?.length).toBe(95)
  })

  test('should compare prefix groups /api/{group}', async () => {
    const result = await buildPrefixGroupChangelogPackage({ packageId: 'prefix-groups/mixed-cases' })

    expect(result).toEqual(changesSummaryMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 2,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 2,
    }))
  })

  test('should compare prefix groups /api/{group} when prefix specified in server', async () => {
    const result = await buildPrefixGroupChangelogPackage({
      packageId: 'prefix-groups/mixed-cases-with-bulk-prefix-increment',
      config: { files: [{ fileId: 'spec1.yaml' }, { fileId: 'spec2.yaml' }] },
    })

    expect(result).toEqual(operationChangesMatcher([
      expect.objectContaining({
        previousOperationId: 'removed-get',
      }),
      expect.objectContaining({
        operationId: 'added-get',
      }),
      expect.objectContaining({
        operationId: 'changed1-get',
      }),
    ]))
    expect(result).toEqual(changesSummaryMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 1,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 1,
    }))
  })

  test('should compare prefix groups /api/{group} when prefix is moved from server to path', async () => {
    const result = await buildPrefixGroupChangelogPackage({
      packageId: 'prefix-groups/mixed-cases-with-prefix-moved-from-server-to-path',
      config: { files: [{ fileId: 'spec1.yaml' }, { fileId: 'spec2.yaml' }] },
    })

    expect(result).toEqual(changesSummaryMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 1,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 1,
    }))
  })

  // todo: case that we don't support due to shifting to the new changelog calculation approach which involves comparison of the entire docs instead of the operation vs operation comparison
  test.skip('should compare prefix groups /api/{group} when prefix is overridden in method', async () => {
    const result = await buildPrefixGroupChangelogPackage({
      packageId: 'prefix-groups/mixed-cases-with-method-prefix-override',
      config: { files: [{ fileId: 'spec1.yaml' }, { fileId: 'spec2.yaml' }] },
    })

    expect(result).toEqual(changesSummaryMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 1,// todo
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 1,// todo
    }))
  })

  test('should compare prefix groups /api/{group} when prefix is overridden in path', async () => {
    const result = await buildPrefixGroupChangelogPackage({
      packageId: 'prefix-groups/mixed-cases-with-path-prefix-override',
      config: { files: [{ fileId: 'spec1.yaml' }, { fileId: 'spec2.yaml' }] },
    })

    expect(result).toEqual(changesSummaryMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 1,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
      [ANNOTATION_CHANGE_TYPE]: 1,
    }))
  })

  test('Add method in a new version', async () => {
    const result = await buildPrefixGroupChangelogPackage({ packageId: 'prefix-groups/add-method' })

    expect(result).toEqual(changesSummaryMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [NON_BREAKING_CHANGE_TYPE]: 1 }))
  })

  test('Remove method in a new version', async () => {
    const result = await buildPrefixGroupChangelogPackage({ packageId: 'prefix-groups/remove-method' })

    expect(result).toEqual(changesSummaryMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [BREAKING_CHANGE_TYPE]: 1 }))
  })

  test('Change method content in a new version', async () => {
    const result = await buildPrefixGroupChangelogPackage({ packageId: 'prefix-groups/change-method' })

    expect(result).toEqual(changesSummaryMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
    }))
  })

  test('should compare prefix groups with different length', async () => {
    const result = await buildPrefixGroupChangelogPackage({
      packageId: 'prefix-groups/different-prefix-length',
      config: {
        previousGroup: '/api/v10',
        currentGroup: 'api/v1000/',
      },
    })

    expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [ANNOTATION_CHANGE_TYPE]: 1 }))
  })

  // todo add case when api/v1 in servers and api/v2 in some paths?
})
