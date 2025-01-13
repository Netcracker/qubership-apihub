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

import { test } from '@fixtures'
import { CLEAR_TD } from '@test-setup'

test.describe('Portal Tests Teardown', async () => {
  test.skip(CLEAR_TD === 'skip', 'Test Data clearing is skipped')

  test('Test Entities deletion', async ({ apihubTdmLongTimeout: cleaner }) => {
    CLEAR_TD === 'all' && await cleaner.deleteTestEntities(process.env.TEST_ID_R!)
    await cleaner.deleteTestEntities(process.env.TEST_ID_N!)
  })
})
