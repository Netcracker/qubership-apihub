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
