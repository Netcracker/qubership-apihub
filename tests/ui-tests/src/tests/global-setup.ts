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

import { saveSsFileByLocalViaAPI } from '@services/storage-state'
import { createUsersTDM } from '@services/test-data-manager'
import { AUTH } from '@test-setup'
import { SYSADMIN, TEST_PREFIX } from '@test-data'
import { mkdir } from 'fs/promises'
import { logEnvVars, setNonReusableTestId, setReusableTestId, stringifyError } from '@services/utils'
import { ROOT_DOWNLOADS } from '@shared/entities'
import path from 'node:path'

async function globalSetup(): Promise<void> {

  // Print environment variables
  logEnvVars([
    'BASE_URL',
    'PLAYGROUND_BACKEND_HOST',
    'DEV_PROXY_MODE',
    'TICKET_SYSTEM_URL',
    'AUTH',
    'CREATE_TD',
    'CLEAR_TD',
    'TEST_ID_R',
    'TEST_ID_N',
    'ADV_FILE',
  ])

  // Verify Test Prefix
  if (!/^[a-z0-9]+[-]$/ig.test(TEST_PREFIX)) {
    throw new Error(`Test Prefix is "${TEST_PREFIX}"\nBut must contain only letters, numbers and end with "-".`)
  }

  // Set test IDs
  process.env.TEST_ID_R = setReusableTestId()
  process.env.TEST_ID_N = setNonReusableTestId()

  // Create temp directories
  try {
    await mkdir(path.resolve(ROOT_DOWNLOADS), { recursive: true })
    await mkdir('./temp/storage-state', { recursive: true })
  } catch (e) {
    throw Error(stringifyError(e))
  }

  // Save storage state
  if (AUTH !== 'skip') {
    // Create system User
    const tdm = await createUsersTDM()
    await tdm.createSysadmin(SYSADMIN)

    await saveSsFileByLocalViaAPI(SYSADMIN)
  }
}

export default globalSetup
