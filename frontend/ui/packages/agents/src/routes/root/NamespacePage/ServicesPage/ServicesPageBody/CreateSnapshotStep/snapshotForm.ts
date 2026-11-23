import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { checkVersionRestrictedSymbols } from '@netcracker/qubership-apihub-ui-shared/utils/validations'

import type { PackageKey, VersionKey } from '@agents/entities/keys'
import {
  BASELINE_VERSIONS_PAGE_SIZE,
  type BaselineVersionSearch,
  type FoundBaselineVersions,
  type Service,
} from '@agents/entities/services'
import { NO_PREVIOUS_VERSION_OPTION } from '@agents/entities/snapshots'

export const SNAPSHOT_VERSION_EQUALS_BASELINE_ERROR = 'Snapshot version must not be the same as Baseline Version'

export type BaselineVersionSplit = Readonly<{
  matching: ReadonlyArray<Service>
  notMatching: ReadonlyArray<Service>
}>

type ServiceBaseline = NonNullable<Service['baseline']>

/**
 * Returns the error of a snapshot version, or `undefined` for a valid one. An empty version has no error: the field is
 * required, and "Create Snapshot" stays disabled while it is empty.
 */
export function getSnapshotVersionError(snapshotVersion: VersionKey, baselineVersion: VersionKey): string | undefined {
  const restrictedSymbolsCheck = checkVersionRestrictedSymbols(snapshotVersion)
  if (typeof restrictedSymbolsCheck === 'string') {
    return restrictedSymbolsCheck
  }
  if (snapshotVersion !== '' && snapshotVersion === baselineVersion) {
    return SNAPSHOT_VERSION_EQUALS_BASELINE_ERROR
  }
  return undefined
}

/**
 * Splits the services by whether their baseline package holds the baseline version. With "No previous version" every
 * service matches, since the snapshot compares none of them with a previous version.
 */
export function splitByBaselineVersion(
  services: ReadonlyArray<Service>,
  baselineVersion: VersionKey,
): BaselineVersionSplit {
  const isMatching = (service: Service): boolean =>
    baselineVersion === NO_PREVIOUS_VERSION_OPTION || holdsVersion(service.baseline, baselineVersion)
  return {
    matching: services.filter(isMatching),
    notMatching: services.filter(service => !isMatching(service)),
  }
}

/**
 * Lists the searches of `searchText` in the baseline packages whose release versions discovery may list only in part:
 * the packages with a full page of versions. An empty text searches nothing.
 */
export function getBaselineSearchesForText(
  services: ReadonlyArray<Service>,
  searchText: string,
): ReadonlyArray<BaselineVersionSearch> {
  if (searchText === '') {
    return []
  }
  return getFullBaselines(services).map(({ packageKey }) => ({ packageKey: packageKey, textFilter: searchText }))
}

/**
 * Lists the searches that find out whether the baseline packages hold `versionKey` beyond the versions that discovery
 * lists: one for each package with a full page of versions that lacks it. An empty version and "No previous version"
 * search nothing.
 */
export function getBaselineSearchesForVersion(
  services: ReadonlyArray<Service>,
  versionKey: VersionKey,
): ReadonlyArray<BaselineVersionSearch> {
  if (versionKey === '' || versionKey === NO_PREVIOUS_VERSION_OPTION) {
    return []
  }
  return getFullBaselines(services)
    .filter(baseline => !holdsVersion(baseline, versionKey))
    .map(({ packageKey }) => ({ packageKey: packageKey, textFilter: versionKey }))
}

/**
 * Adds the found versions of each baseline package to its services, after the versions that discovery lists and
 * without repeating a version. Returns `services` itself when nothing was found, so a memoized consumer keeps it.
 */
export function getServicesWithFoundVersions(
  services: ReadonlyArray<Service>,
  foundVersions: ReadonlyArray<FoundBaselineVersions>,
): ReadonlyArray<Service> {
  if (isEmpty(foundVersions)) {
    return services
  }
  return services.map(service => {
    const { baseline } = service
    if (!baseline) {
      return service
    }
    const addedVersions = new Map(
      foundVersions
        .filter(({ packageKey }) => packageKey === baseline.packageKey)
        .flatMap(({ versions }) => versions)
        .filter(({ versionKey }) => !holdsVersion(baseline, versionKey))
        .map(version => [version.versionKey, version] as const),
    )
    if (addedVersions.size === 0) {
      return service
    }
    return { ...service, baseline: { ...baseline, versions: [...baseline.versions, ...addedVersions.values()] } }
  })
}

function holdsVersion(baseline: ServiceBaseline | undefined, versionKey: VersionKey): boolean {
  return baseline?.versions.some(version => version.versionKey === versionKey) ?? false
}

// Several services can share a baseline package; each package is searched once
function getFullBaselines(services: ReadonlyArray<Service>): ReadonlyArray<ServiceBaseline> {
  const fullBaselinesByPackageKey = new Map<PackageKey, ServiceBaseline>()
  for (const { baseline } of services) {
    if (baseline && baseline.versions.length >= BASELINE_VERSIONS_PAGE_SIZE) {
      fullBaselinesByPackageKey.set(baseline.packageKey, baseline)
    }
  }
  return [...fullBaselinesByPackageKey.values()]
}
