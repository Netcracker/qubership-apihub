import { USER } from '@netcracker/qubership-apihub-ui-shared/entities/principals'
import {
  RELEASE_VERSION_STATUS,
  type VersionStatus,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { sortByProperty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

import type { LibraryVersion } from '@portal/entities/libraries'
import type { PreviousLibraryVersion } from './javaapi/java-api'

export function getLibraryComparisonDefaultVersion(
  version: LibraryVersion,
  versions: ReadonlyArray<LibraryVersion>,
  previous: PreviousLibraryVersion,
): LibraryVersion | undefined {
  const libraryId = previous.previousLibraryId ?? version.libraryId
  const previousVersion = previous.previousVersion ?? version.previousVersion
  const candidates = versions.filter(item => libraryId !== version.libraryId || item.version !== version.version)
  return candidates.find(item => item.version === previousVersion) ?? candidates[0]
}

export function toLibraryVersionOption(version: LibraryVersion): PackageVersion {
  return {
    key: version.version,
    status: version.status,
    createdAt: version.createdAt,
    createdBy: { type: USER, id: version.createdBy ?? '', name: version.createdBy },
    versionLabels: version.labels,
    previousVersion: version.previousVersion,
    latestRevision: true,
  }
}

export function selectLibraryVersions(
  versions: ReadonlyArray<LibraryVersion>,
  status: VersionStatus,
  search: string,
): LibraryVersion[] {
  const text = search.toLowerCase()
  const matching = versions.filter(version => {
    if (version.status !== status) return false
    return [version.version, ...version.labels].some(value => value.toLowerCase().includes(text))
  })
  if (status === RELEASE_VERSION_STATUS) return sortByProperty(matching, 'version').reverse()
  return matching.sort((a, b) => {
    const aDate = a.createdAt ? Date.parse(a.createdAt) : 0
    const bDate = b.createdAt ? Date.parse(b.createdAt) : 0
    return bDate - aDate
  })
}
