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
  buildChangelogPackage,
  changesSummaryMatcher,
  Editor,
  LocalRegistry,
  numberOfImpactedOperationsMatcher,
} from './helpers'
import { ANNOTATION_CHANGE_TYPE, BREAKING_CHANGE_TYPE } from '../src'

let beforePackage: LocalRegistry
let afterPackage: LocalRegistry
const BEFORE_PACKAGE_ID = 'changes_test_before'
const AFTER_PACKAGE_ID = 'changes_test_after'
const BEFORE_VERSION_ID = 'v1'
const AFTER_VERSION_ID = 'v2'

describe('Changes test', () => {
  beforeAll(async () => {
    beforePackage = LocalRegistry.openPackage(BEFORE_PACKAGE_ID)
    afterPackage = LocalRegistry.openPackage(AFTER_PACKAGE_ID)

    await beforePackage.publish(BEFORE_PACKAGE_ID, {
      version: 'v1',
      packageId: BEFORE_PACKAGE_ID,
    })
    await afterPackage.publish(AFTER_PACKAGE_ID, {
      version: 'v2',
      packageId: AFTER_PACKAGE_ID,
    })
  })

  test('comparison should have 1 breaking and 1 annotation changes', async () => {
    const editor = await Editor.openProject(AFTER_PACKAGE_ID, afterPackage)
    const result = await editor.run({
      version: AFTER_VERSION_ID,
      packageId: AFTER_PACKAGE_ID,
      previousVersionPackageId: BEFORE_PACKAGE_ID,
      previousVersion: BEFORE_VERSION_ID,
      buildType: 'changelog',
    })

    const [{ operationTypes: [{ changesSummary }] }] = result.comparisons
    expect(changesSummary?.[BREAKING_CHANGE_TYPE]).toBe(1)
    expect(changesSummary?.[ANNOTATION_CHANGE_TYPE]).toBe(1)
  })

  test('compare parametrized operations', async () => {
    const result = await buildChangelogPackage('compare-parametrized-operations')
    expect(result).toEqual(changesSummaryMatcher({ [ANNOTATION_CHANGE_TYPE]: 2}))
    expect(result).toEqual(numberOfImpactedOperationsMatcher({ [ANNOTATION_CHANGE_TYPE]: 1}))
  })
})
