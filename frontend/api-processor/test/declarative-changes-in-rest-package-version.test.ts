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

import { buildChangelogPackage, expectChangeCounts } from './helpers'
import { BREAKING_CHANGE_TYPE, NON_BREAKING_CHANGE_TYPE, RISKY_CHANGE_TYPE } from '../src'

describe('Number of declarative changes in rest package version test', () => {
  test('Two operations use one schema in response', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-package-version/case1')
    expectChangeCounts(result, { changes: { [BREAKING_CHANGE_TYPE]: 1 }, impacted: { [BREAKING_CHANGE_TYPE]: 2 } })
  })

  test('Two operations use one schema in response and request (same severity)', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-package-version/case2')
    expectChangeCounts(result, { changes: { [BREAKING_CHANGE_TYPE]: 2 }, impacted: { [BREAKING_CHANGE_TYPE]: 2 } })
  })

  test('Two operations use one schema in response and request (different severity)', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-package-version/case3')
    expectChangeCounts(result, {
      changes: {
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      },
      impacted: {
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      },
    })
  })

  test('Two operations use different schemas but the same schema names', async () => {
    const result = await buildChangelogPackage(
      'declarative-changes-in-rest-package-version/case4',
      [{ fileId: 'before1.yaml' }, { fileId: 'before2.yaml' }],
      [{ fileId: 'after1.yaml' }, { fileId: 'after2.yaml' }],
    )
    expectChangeCounts(result, {
      changes: { [NON_BREAKING_CHANGE_TYPE]: 2 },
      impacted: { [NON_BREAKING_CHANGE_TYPE]: 2 },
    })
  })

  test('Two operations use one schema in response but one of the operations is no-BWC', async () => {
    const result = await buildChangelogPackage('declarative-changes-in-rest-package-version/case5')
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

  test('Uses synthetic document when there is no existing appropriate document pair', async () => {
    const result = await buildChangelogPackage(
      'declarative-changes-in-rest-package-version/whole-documents-added-removed',
      [{ fileId: 'before1.yaml' }],
      [{ fileId: 'after2.yaml' }],
    )
    expectChangeCounts(result, {
      changes: {
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      },
      impacted: {
        [BREAKING_CHANGE_TYPE]: 1,
        [NON_BREAKING_CHANGE_TYPE]: 1,
      },
    })
  })

  test('Changes are not duplicated when deleted operation could be mapped to several documents', async () => {
    const result = await buildChangelogPackage(
      'declarative-changes-in-rest-package-version/deleted-operation-mapped-to-several-documents',
      [{ fileId: 'before1.yaml' }],
      [{ fileId: 'after2.yaml' }, { fileId: 'after3.yaml' }],
    )
    expectChangeCounts(result, { changes: { [BREAKING_CHANGE_TYPE]: 1 }, impacted: { [BREAKING_CHANGE_TYPE]: 1 } })
  })
})
