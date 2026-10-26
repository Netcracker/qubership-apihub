import { createRestWithCredentials, rGetExtensionVersion, rGetSystemInfo } from '@services/rest'
import { BASE_URL } from '@test-setup'
import { getRestFailMsg } from '@services/utils'
import { SYSADMIN } from '@test-data'

export async function getSysInfo(): Promise<SysInfo> {
  const rest = await createRestWithCredentials(BASE_URL, SYSADMIN)
  const response = await rest.send(rGetSystemInfo, [200])
  const jsonBody = await response.json()
  if (response.status() !== 200) {
    throw Error(await getRestFailMsg('Getting System Information', response))
  }

  const buildInfo: BuildInfo = {
    backendVersion: jsonBody.backendVersion,
    productionMode: jsonBody.productionMode,
  }

  return {
    environment: BASE_URL.origin,
    build: buildInfo,
  }
}

// `pathPrefix` of the extension: 'api-linter' or 'agents-backend'.
export async function getExtensionVersion(pathPrefix: string): Promise<string> {
  const rest = await createRestWithCredentials(BASE_URL, SYSADMIN)
  const response = await rest.send(rGetExtensionVersion, [200], pathPrefix)
  if (response.status() !== 200) {
    throw Error(await getRestFailMsg(`Getting the version of ${pathPrefix}`, response))
  }

  return (await response.json()).version
}

interface SysInfo {
  environment: string
  build: BuildInfo
}

interface BuildInfo {
  backendVersion: string
  productionMode: boolean
}
