import { getAuthDataFromStorageStateFile } from '@services/auth'
import { SS_SYSADMIN_PATH } from '@services/storage-state'
import { createRest, rGetSysConfig } from '@services/rest'
import { BASE_ORIGIN } from '@test-setup'
import { getRestFailMsg } from '@services/utils'

export async function getSysConfig(): Promise<SysConfig> {
  const authData = await getAuthDataFromStorageStateFile(SS_SYSADMIN_PATH)
  const rest = await createRest(BASE_ORIGIN, authData.token)
  const response = await rest.send(rGetSysConfig, [200])
  const jsonBody = await response.json()
  if (response.status() !== 200) {
    throw Error(await getRestFailMsg('Getting System Configuration', response))
  }

  return {
    autoRedirect: jsonBody.autoRedirect,
    ssoIntegrationEnabled: jsonBody.ssoIntegrationEnabled,
    defaultWorkspaceId: jsonBody.defaultWorkspaceId,
  }
}

interface SysConfig {
  autoRedirect: boolean
  ssoIntegrationEnabled: boolean
  defaultWorkspaceId: string
}
