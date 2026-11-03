import { createRestWithToken, rGetSysConfig } from '@services/rest'
import { BASE_URL } from '@test-setup'
import { getRestFailMsg } from '@services/utils'

// The configuration needs no login: the UI reads it before one.
export async function getSysConfig(): Promise<SysConfig> {
  const rest = await createRestWithToken(BASE_URL)
  const response = await rest.send(rGetSysConfig, [200])
  if (response.status() !== 200) {
    throw Error(await getRestFailMsg('Getting System Configuration', response))
  }
  const jsonBody = await response.json()

  return {
    defaultWorkspaceId: jsonBody.defaultWorkspaceId,
    extensions: jsonBody.extensions,
  }
}

export interface SysExtension {
  name: string
  pathPrefix: string
}

interface SysConfig {
  defaultWorkspaceId: string
  // The extensions that this stand registers.
  extensions: SysExtension[]
}
