import { createRestWithCredentials, rGetSysConfig } from '@services/rest'
import { BASE_URL } from '@test-setup'
import { getRestFailMsg } from '@services/utils'
import { SYSADMIN } from '@test-data'

export async function getSysConfig(): Promise<SysConfig> {
  const rest = await createRestWithCredentials(BASE_URL, SYSADMIN)
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
