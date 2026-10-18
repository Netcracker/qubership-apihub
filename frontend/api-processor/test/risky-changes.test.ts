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

import { Editor, expectChangeCounts, LocalRegistry } from './helpers'
import { BREAKING_CHANGE_TYPE, BUILD_TYPE, NON_BREAKING_CHANGE_TYPE, RISKY_CHANGE_TYPE, VERSION_STATUS } from '../src'

const portal = new LocalRegistry('new-deprecated')

describe('Risky changes test', () => {
  test('should build 1 risky change', async () => {
    const packageId = 'new-deprecated-semibreaking'

    await portal.publish('new-deprecated/semi-breaking-changes', {
      packageId: packageId,
      version: 'v1',
      files: [{ fileId: 'before.yaml' }],
    })
    await portal.publish('new-deprecated/semi-breaking-changes', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [{ fileId: 'before.yaml' }],
    })
    await portal.publish('new-deprecated/semi-breaking-changes', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      files: [{ fileId: 'after.yaml' }],
    })

    const editor = new Editor('new-deprecated/semi-breaking-changes', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.RELEASE,
    }, {}, portal)

    const result = await editor.run()
    expectChangeCounts(result, {
      changes: {
        [NON_BREAKING_CHANGE_TYPE]: 1,
        [RISKY_CHANGE_TYPE]: 1,
      },
      impacted: {
        [NON_BREAKING_CHANGE_TYPE]: 1,
        [RISKY_CHANGE_TYPE]: 1,
      },
    })
  })

  test('should build 1 semi-breaking change and 1 breaking change', async () => {
    const packageId = 'new-deprecated-semibreaking-inline'

    await portal.publish('new-deprecated/semi-breaking-classification', {
      packageId: packageId,
      version: 'v1',
      files: [{ fileId: 'v1.yaml' }],
    })
    await portal.publish('new-deprecated/semi-breaking-classification', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [{ fileId: 'v2.yaml' }],
    })
    await portal.publish('new-deprecated/semi-breaking-classification', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      files: [{ fileId: 'v3.yaml' }],
    })

    const editor = new Editor('new-deprecated/semi-breaking-classification', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.RELEASE,
    }, {}, portal)

    const result = await editor.run()
    expectChangeCounts(result, {
      changes: {
        [BREAKING_CHANGE_TYPE]: 1,
        [RISKY_CHANGE_TYPE]: 1,
      },
      impacted: {
        [BREAKING_CHANGE_TYPE]: 1,
        [RISKY_CHANGE_TYPE]: 1,
      },
    })
  })

  test('should build 1 semi-breaking change for schema', async () => {
    const packageId = 'new-deprecated-semibreaking-schema'

    await portal.publish('new-deprecated/one-schema-usage', {
      packageId: packageId,
      version: 'v1',
      files: [{ fileId: 'before.yaml' }],
    })
    await portal.publish('new-deprecated/one-schema-usage', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [{ fileId: 'before.yaml' }],
    })
    await portal.publish('new-deprecated/one-schema-usage', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      files: [{ fileId: 'after.yaml' }],
    })
    const editor = new Editor('new-deprecated/one-schema-usage', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.RELEASE,
    }, {}, portal)

    const result = await editor.run()

    expectChangeCounts(result, {
      changes: {
        [RISKY_CHANGE_TYPE]: 2,
      },
      impacted: {
        [RISKY_CHANGE_TYPE]: 2,
      },
    })
  })

  test('should build 3 risky change for removed required property and required status', async () => {
    const packageId = 'new-deprecated-semibreaking-required'

    await portal.publish('new-deprecated/semi-breaking-required', {
      packageId: packageId,
      version: 'v1',
      files: [{ fileId: 'before.yaml' }],
    })
    await portal.publish('new-deprecated/semi-breaking-required', {
      packageId: packageId,
      version: 'v2',
      previousVersion: 'v1',
      files: [{ fileId: 'before.yaml' }],
    })
    await portal.publish('new-deprecated/semi-breaking-required', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      files: [{ fileId: 'after.yaml' }],
    })
    const editor = new Editor('new-deprecated/semi-breaking-required', {
      packageId: packageId,
      version: 'v3',
      previousVersion: 'v2',
      buildType: BUILD_TYPE.CHANGELOG,
      status: VERSION_STATUS.RELEASE,
    }, {}, portal)

    const result = await editor.run()

    expectChangeCounts(result, {
      changes: {
        [RISKY_CHANGE_TYPE]: 3,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      },
      impacted: {
        [RISKY_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      },
    })
  })
})
