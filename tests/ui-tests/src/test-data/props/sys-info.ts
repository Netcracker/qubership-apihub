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
