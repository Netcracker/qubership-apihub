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

import { Editor, expectSummariesMatchDiffs, LocalRegistry } from './helpers'
import { ANNOTATION_CHANGE_TYPE, BREAKING_CHANGE_TYPE, BUILD_TYPE, NON_BREAKING_CHANGE_TYPE } from '../src'

// a package per case: the versions of two cases would otherwise share the slugs `before` and `after`
const FIXTURE_ROOT = 'classification-bugs'
const classificationBugsPackage = LocalRegistry.openPackage(FIXTURE_ROOT)

const REQUEST_V1_VERSION = 'request-v1'
const REQUEST_V2_VERSION = 'request-v2'
const RESPONSE_V1_VERSION = 'response-v1'
const RESPONSE_V2_VERSION = 'response-v2'
const RESPONSE_4XX_V1_VERSION = 'response-4xx-v1'
const RESPONSE_4XX_V2_VERSION = 'response-4XX-v2'
const HEADERS_V1_VERSION = 'headers-v1'
const HEADERS_V2_VERSION = 'headers-v2'
const HEADER_REMOVED_V1_VERSION = 'header-removed-v1'
const HEADER_REMOVED_V2_VERSION = 'header-removed-v2'
const SERVERS_V1_VERSION = 'servers-v1'
const SERVERS_V2_VERSION = 'servers-v2'

describe('Classification bugs test', () => {
  beforeAll(async () => {
    // Publish Request body versions
    await classificationBugsPackage.publish(`${FIXTURE_ROOT}/request-additional-properties`, {
      packageId: `${FIXTURE_ROOT}/request-additional-properties`,
      version: REQUEST_V1_VERSION,
      files: [{
        fileId: 'before.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(`${FIXTURE_ROOT}/request-additional-properties`, {
      packageId: `${FIXTURE_ROOT}/request-additional-properties`,
      version: REQUEST_V2_VERSION,
      files: [{
        fileId: 'after.json',
        publish: true,
      }],
    })

    // Publish Response versions
    await classificationBugsPackage.publish(`${FIXTURE_ROOT}/response-additional-properties`, {
      packageId: `${FIXTURE_ROOT}/response-additional-properties`,
      version: RESPONSE_V1_VERSION,
      files: [{
        fileId: 'before.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(`${FIXTURE_ROOT}/response-additional-properties`, {
      packageId: `${FIXTURE_ROOT}/response-additional-properties`,
      version: RESPONSE_V2_VERSION,
      files: [{
        fileId: 'after.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(`${FIXTURE_ROOT}/response-4xx`, {
      packageId: `${FIXTURE_ROOT}/response-4xx`,
      version: RESPONSE_4XX_V1_VERSION,
      files: [{
        fileId: 'before.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(`${FIXTURE_ROOT}/response-4xx`, {
      packageId: `${FIXTURE_ROOT}/response-4xx`,
      version: RESPONSE_4XX_V2_VERSION,
      files: [{
        fileId: 'after.json',
        publish: true,
      }],
    })

    // Publish Headers versions
    await classificationBugsPackage.publish(`${FIXTURE_ROOT}/headers`, {
      packageId: `${FIXTURE_ROOT}/headers`,
      version: HEADERS_V1_VERSION,
      files: [{
        fileId: 'before.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(`${FIXTURE_ROOT}/headers`, {
      packageId: `${FIXTURE_ROOT}/headers`,
      version: HEADERS_V2_VERSION,
      files: [{
        fileId: 'after.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(`${FIXTURE_ROOT}/header-removed`, {
      packageId: `${FIXTURE_ROOT}/header-removed`,
      version: HEADER_REMOVED_V1_VERSION,
      files: [{
        fileId: 'before.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(`${FIXTURE_ROOT}/header-removed`, {
      packageId: `${FIXTURE_ROOT}/header-removed`,
      version: HEADER_REMOVED_V2_VERSION,
      files: [{
        fileId: 'after.json',
        publish: true,
      }],
    })

    // Publish servers versions
    await classificationBugsPackage.publish(`${FIXTURE_ROOT}/servers`, {
      packageId: `${FIXTURE_ROOT}/servers`,
      version: SERVERS_V1_VERSION,
      files: [{
        fileId: 'before.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(`${FIXTURE_ROOT}/servers`, {
      packageId: `${FIXTURE_ROOT}/servers`,
      version: SERVERS_V2_VERSION,
      files: [{
        fileId: 'after.json',
        publish: true,
      }],
    })
  })

  test('[Response] Should be non-breaking if response code changed in case', async () => {
    const editor = await Editor.openProject(`${FIXTURE_ROOT}/response-4xx`)
    const result = await editor.run({
      version: RESPONSE_4XX_V2_VERSION,
      previousVersion: RESPONSE_4XX_V1_VERSION,
      buildType: BUILD_TYPE.CHANGELOG,
    })

    expect(result.comparisons?.[0]?.data?.[0]?.changeSummary?.[BREAKING_CHANGE_TYPE]).toBe(0)
    expect(result.comparisons?.[0]?.data?.[0]?.changeSummary?.[NON_BREAKING_CHANGE_TYPE]).toBe(1)
    expectSummariesMatchDiffs(result)
  })

  test('[Servers] Changing servers must be a non-breaking change', async () => {
    const editor = await Editor.openProject(`${FIXTURE_ROOT}/servers`)
    const result = await editor.run({
      version: SERVERS_V2_VERSION,
      previousVersion: SERVERS_V1_VERSION,
      buildType: BUILD_TYPE.CHANGELOG,
    })

    expect(result.comparisons?.[0]?.data?.[0]?.changeSummary?.[BREAKING_CHANGE_TYPE]).toBe(0)
    expect(result.comparisons?.[0]?.data?.[0]?.changeSummary?.[ANNOTATION_CHANGE_TYPE]).toBe(1)
    expectSummariesMatchDiffs(result)
  })
})
