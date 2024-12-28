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
import { ANNOTATION_CHANGE_TYPE, BREAKING_CHANGE_TYPE, BUILD_TYPE, NON_BREAKING_CHANGE_TYPE } from '../src'

const packageId = 'classification-bugs'
const classificationBugsPackage = LocalRegistry.openPackage(packageId)

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
    await classificationBugsPackage.publish(packageId, {
      version: REQUEST_V1_VERSION,
      files: [{
        fileId: 'request_additionalProperties_v1.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(packageId, {
      version: REQUEST_V2_VERSION,
      files: [{
        fileId: 'request_additionalProperties_v2.json',
        publish: true,
      }],
    })

    // Publish Response versions
    await classificationBugsPackage.publish(packageId, {
      version: RESPONSE_V1_VERSION,
      files: [{
        fileId: 'response_additionalProperties_v1.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(packageId, {
      version: RESPONSE_V2_VERSION,
      files: [{
        fileId: 'response_additionalProperties_v2.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(packageId, {
      version: RESPONSE_4XX_V1_VERSION,
      files: [{
        fileId: 'response_4xx_v1.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(packageId, {
      version: RESPONSE_4XX_V2_VERSION,
      files: [{
        fileId: 'response_4XX_v2.json',
        publish: true,
      }],
    })

    // Publish Headers versions
    await classificationBugsPackage.publish(packageId, {
      version: HEADERS_V1_VERSION,
      files: [{
        fileId: 'headers_v1.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(packageId, {
      version: HEADERS_V2_VERSION,
      files: [{
        fileId: 'headers_v2.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(packageId, {
      version: HEADER_REMOVED_V1_VERSION,
      files: [{
        fileId: 'header-removed_v1.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(packageId, {
      version: HEADER_REMOVED_V2_VERSION,
      files: [{
        fileId: 'header-removed_v2.json',
        publish: true,
      }],
    })

    // Publish servers versions
    await classificationBugsPackage.publish(packageId, {
      version: SERVERS_V1_VERSION,
      files: [{
        fileId: 'servers_v1.json',
        publish: true,
      }],
    })
    await classificationBugsPackage.publish(packageId, {
      version: SERVERS_V2_VERSION,
      files: [{
        fileId: 'servers_v2.json',
        publish: true,
      }],
    })
  })

  test('[Response] Should be non-breaking if response code changed in case', async () => {
    const editor = await Editor.openProject(packageId)
    const result = await editor.run({
      version: RESPONSE_4XX_V2_VERSION,
      previousVersion: RESPONSE_4XX_V1_VERSION,
      buildType: BUILD_TYPE.CHANGELOG,
    })

    expect(result.comparisons?.[0]?.data?.[0]?.changeSummary?.[BREAKING_CHANGE_TYPE]).toBe(0)
    expect(result.comparisons?.[0]?.data?.[0]?.changeSummary?.[NON_BREAKING_CHANGE_TYPE]).toBe(1)
  })

  test('[Servers] Changing servers must be a non-breaking change', async () => {
    const editor = await Editor.openProject(packageId)
    const result = await editor.run({
      version: SERVERS_V2_VERSION,
      previousVersion: SERVERS_V1_VERSION,
      buildType: BUILD_TYPE.CHANGELOG,
    })

    expect(result.comparisons?.[0]?.data?.[0]?.changeSummary?.[BREAKING_CHANGE_TYPE]).toBe(0)
    expect(result.comparisons?.[0]?.data?.[0]?.changeSummary?.[ANNOTATION_CHANGE_TYPE]).toBe(1)
  })
})
