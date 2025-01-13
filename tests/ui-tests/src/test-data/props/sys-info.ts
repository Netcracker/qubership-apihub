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

import { getAuthDataFromStorageStateFile } from '@services/auth'
import { SS_SYSADMIN_PATH } from '@services/storage-state'
import { createRest, rGetSystemInfo } from '@services/rest'
import { BASE_ORIGIN } from '@test-setup'
import { getRestFailMsg } from '@services/utils'

export async function getSysInfo(): Promise<SysInfo> {
  const authData = await getAuthDataFromStorageStateFile(SS_SYSADMIN_PATH)
  const rest = await createRest(BASE_ORIGIN, authData.token)
  const response = await rest.send(rGetSystemInfo, [200])
  const jsonBody = await response.json()
  if (response.status() !== 200) {
    throw Error(await getRestFailMsg('Getting System Information', response))
  }

  const buildInfo: {
    backendVersion: string
    frontendVersion: string
    productionMode: boolean
  } = {
    backendVersion: jsonBody.backendVersion,
    frontendVersion: (jsonBody.frontendVersion).replace('\n', ''),
    productionMode: jsonBody.productionMode,
  }

  return {
    environment: BASE_ORIGIN,
    build: buildInfo,
  }
}

interface SysInfo {
  environment: string
  build: {
    backendVersion: string
    frontendVersion: string
    productionMode: boolean
  }
}
