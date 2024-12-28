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

import { changesSummaryMatcher, Editor, LocalRegistry, numberOfImpactedOperationsMatcher } from './helpers'
import {
  BREAKING_CHANGE_TYPE,
  BUILD_TYPE,
  NON_BREAKING_CHANGE_TYPE,
  SEMI_BREAKING_CHANGE_TYPE,
  VERSION_STATUS,
} from '../src'

const portal = new LocalRegistry('new-deprecated')

describe('Semi-breaking changes test', () => {
  test('should build 1 semi-breaking change', async () => {
    const packageId = 'new-deprecated-semibreaking'

    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v1',
      files: [{ fileId: 'semi-breaking-changes.yaml' }],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [{ fileId: 'semi-breaking-changes.yaml' }],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      files: [{ fileId: 'semi-breaking-changes2.yaml' }],
    })

    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.RELEASE,
    }, {}, portal)

    const result = await editor.run()

    expect(result).toEqual(changesSummaryMatcher({
      [NON_BREAKING_CHANGE_TYPE]: 1,
      [SEMI_BREAKING_CHANGE_TYPE]: 1,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [NON_BREAKING_CHANGE_TYPE]: 1,
      [SEMI_BREAKING_CHANGE_TYPE]: 1,
    }))
  })

  test('should build 1 semi-breaking change and 1 breaking change', async () => {
    const packageId = 'new-deprecated-semibreaking-inline'

    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v1',
      files: [{ fileId: 'semi-breaking-classification-1.yaml' }],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [{ fileId: 'semi-breaking-classification-2.yaml' }],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      files: [{ fileId: 'semi-breaking-classification-3.yaml' }],
    })

    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.RELEASE,
    }, {}, portal)

    const result = await editor.run()

    expect(result).toEqual(changesSummaryMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [SEMI_BREAKING_CHANGE_TYPE]: 1,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [BREAKING_CHANGE_TYPE]: 1,
      [SEMI_BREAKING_CHANGE_TYPE]: 1,
    }))
  })

  test('should build 1 semi-breaking change for schema', async () => {
    const packageId = 'new-deprecated-semibreaking-schema'

    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v1',
      files: [{ fileId: 'one-schema-usage-1.yaml' }],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [{ fileId: 'one-schema-usage-1.yaml' }],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      files: [{ fileId: 'one-schema-usage-2.yaml' }],
    })
    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.RELEASE,
    }, {}, portal)

    const result = await editor.run()

    expect(result).toEqual(changesSummaryMatcher({
      [SEMI_BREAKING_CHANGE_TYPE]: 2,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [SEMI_BREAKING_CHANGE_TYPE]: 2,
    }))
  })

  test('should build 3 semi-breaking change for removed required property and required status', async () => {
    const packageId = 'new-deprecated-semibreaking-required'

    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v1',
      files: [{ fileId: 'semi-breaking-required-1.yaml' }],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [{ fileId: 'semi-breaking-required-1.yaml' }],
    })
    await portal.publish('new-deprecated', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      files: [{ fileId: 'semi-breaking-required-2.yaml' }],
    })
    const editor = new Editor('new-deprecated', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.RELEASE,
    }, {}, portal)

    const result = await editor.run()

    expect(result).toEqual(changesSummaryMatcher({
      [SEMI_BREAKING_CHANGE_TYPE]: 3,
      [NON_BREAKING_CHANGE_TYPE]: 1,
    }))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({
      [SEMI_BREAKING_CHANGE_TYPE]: 1,
      [NON_BREAKING_CHANGE_TYPE]: 1,
    }))
  })
})
