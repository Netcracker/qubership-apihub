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

import type { ApihubApps } from '@shared/entities'
import { getAuthDataFromStorageStateFile } from '@services/auth'
import { SS_SYSADMIN_PATH } from '@services/storage-state'
import { createRest, rGetPackageById } from '@services/rest'
import { BASE_ORIGIN } from '@test-setup'
import { P_WS_MAIN_R } from '@test-data/portal'
import { getRestFailMsg } from '@services/utils'

export async function isReusableTestDataExist(app: ApihubApps): Promise<boolean> {
  let id!: string
  switch (app) {
    case 'portal': {
      id = P_WS_MAIN_R.packageId
      break
    }
  }

  const authData = await getAuthDataFromStorageStateFile(SS_SYSADMIN_PATH)
  const rest = await createRest(BASE_ORIGIN, authData.token)

  const response = await rest.send(rGetPackageById, [200, 404], { packageId: id })
  if (response.status() !== 200 && response.status() !== 404) {
    throw Error(await getRestFailMsg(`Getting "${id}" project`, response))
  }
  return response.status() === 200
}
