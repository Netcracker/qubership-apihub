import { createRestWithCredentials, createRestWithToken, rGetSysConfig, rGetSystemConfiguration } from '@services/rest'
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

// The extensions that this stand registers (`extensions` of the backend configuration). The configuration needs no login:
// the UI reads it before one.
export async function getSysExtensions(): Promise<SysExtension[]> {
  const rest = await createRestWithToken(BASE_URL)
  const response = await rest.send(rGetSystemConfiguration, [200])
  if (response.status() !== 200) {
    throw Error(await getRestFailMsg('Getting System Configuration (v2)', response))
  }

  return (await response.json()).extensions
}

export interface SysExtension {
  name: string
  pathPrefix: string
}

interface SysConfig {
  autoRedirect: boolean
  ssoIntegrationEnabled: boolean
  defaultWorkspaceId: string
}
