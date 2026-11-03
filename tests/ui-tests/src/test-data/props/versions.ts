import { createRestWithCredentials, createRestWithToken, rGetAppFile, rGetExtensionVersion } from '@services/rest'
import { BASE_URL } from '@test-setup'
import { getRestFailMsg } from '@services/utils'
import { SYSADMIN } from '@test-data'
import { getSysConfig } from './sys-config'

// The extensions that report a version, by the name they are registered under.
export type VersionedExtensionName = 'api-linter' | 'agents-backend'
export const VERSIONED_EXTENSION_NAMES: readonly VersionedExtensionName[] = ['api-linter', 'agents-backend']

// version.json and build-info.json need no login: nginx serves them as they are. The extension version
// routes use the service authenticator, so the helper logs in.

// The version of each registered extension, from the extension itself. An extension that this stand does not register
// has no entry. The URL comes from the `pathPrefix` of the registration, which is not always the name.
export async function getExtensionVersions(): Promise<Partial<Record<VersionedExtensionName, string>>> {
  const { extensions } = await getSysConfig()
  const rest = await createRestWithCredentials(BASE_URL, SYSADMIN)
  const versions: Partial<Record<VersionedExtensionName, string>> = {}

  for (const name of VERSIONED_EXTENSION_NAMES) {
    const extension = extensions.find(e => e.name === name)
    if (!extension) {
      continue
    }
    const response = await rest.send(rGetExtensionVersion, [200], extension.pathPrefix)
    if (response.status() !== 200) {
      throw Error(await getRestFailMsg(`Getting the version of ${name}`, response))
    }
    versions[name] = (await response.json()).version
  }

  return versions
}

// What the Portal serves about itself: `version.json` always, and `build-info.json` only in a branch-tagged image.
export async function getPortalVersionInfo(): Promise<PortalVersionInfo> {
  const rest = await createRestWithToken(BASE_URL)
  const versionResponse = await rest.send(rGetAppFile, [200], 'portal/version.json')
  if (versionResponse.status() !== 200) {
    throw Error(await getRestFailMsg('Getting version.json of the Portal', versionResponse))
  }
  const { frontendVersion, apiProcessorVersion } = await versionResponse.json()

  const buildResponse = await rest.send(rGetAppFile, [200, 404], 'portal/build-info.json')
  if (buildResponse.status() !== 200) {
    return { frontendVersion, apiProcessorVersion }
  }

  const buildInfo = await buildResponse.json()

  return { frontendVersion, apiProcessorVersion, buildInfo }
}

export interface PortalVersionInfo {
  frontendVersion: string
  apiProcessorVersion: string
  // The image that serves the Portal: the entrypoint writes `committedAt` as an empty string when it has no time.
  buildInfo?: { branch: string; commit: string; committedAt: string }
}
