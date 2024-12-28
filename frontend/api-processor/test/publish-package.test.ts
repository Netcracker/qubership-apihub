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

import { LocalRegistry } from './helpers'

const PACKAGE_ID = 'basic'
const PACKAGE_VERSION = 'v2'
const PREVIOUS_VERSION = 'v1'
const PREVIOUS_VERSION_PACKAGE_ID = ''

const packageToPublish = LocalRegistry.openPackage(PACKAGE_ID)

describe.skip('Publish Package Test', () => {

  test('publish package success', async () => {
    await packageToPublish.publish(PACKAGE_ID, {
      packageId: PACKAGE_ID,
      version: PACKAGE_VERSION,
      previousVersion: PREVIOUS_VERSION,
      previousVersionPackageId: PREVIOUS_VERSION_PACKAGE_ID || PACKAGE_ID,
    })
  })

  test('Update package operations dataHash', async () => {
    await packageToPublish.updateOperationsHash(PACKAGE_ID, {
      packageId: PACKAGE_ID,
      version: PACKAGE_VERSION,
      previousVersion: PREVIOUS_VERSION,
      previousVersionPackageId: PREVIOUS_VERSION_PACKAGE_ID || PACKAGE_ID,
    })
  })

})
