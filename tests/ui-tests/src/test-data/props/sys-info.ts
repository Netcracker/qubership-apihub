import { createRestWithCredentials, rGetAppFile, rGetExtensionVersion, rGetSystemInfo } from '@services/rest'
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

// What the Portal serves about itself: `version.json` always, `build-info.json` only in a branch-tagged image.
export async function getPortalVersionInfo(): Promise<PortalVersionInfo> {
  const rest = await createRestWithCredentials(BASE_URL, SYSADMIN)
  const versionResponse = await rest.send(rGetAppFile, [200], 'portal/version.json')
  if (versionResponse.status() !== 200) {
    throw Error(await getRestFailMsg('Getting version.json of the Portal', versionResponse))
  }
  const { frontendVersion, apiProcessorVersion } = await versionResponse.json()

  const buildResponse = await rest.send(rGetAppFile, [200, 404], 'portal/build-info.json')
  if (buildResponse.status() !== 200) {
    return { frontendVersion, apiProcessorVersion }
  }
  const { branch, commit, committedAt } = await buildResponse.json()
  // The form the Portal shows: <branch>.<commit>.<commit time>; the time is missing when the image has none.
  const buildRef = committedAt ? `${branch}.${commit}.${committedAt}` : `${branch}.${commit}`

  return { frontendVersion, apiProcessorVersion, buildRef }
}

interface PortalVersionInfo {
  frontendVersion: string
  apiProcessorVersion: string
  buildRef?: string
}

interface SysInfo {
  environment: string
  build: BuildInfo
}

interface BuildInfo {
  backendVersion: string
  productionMode: boolean
}
