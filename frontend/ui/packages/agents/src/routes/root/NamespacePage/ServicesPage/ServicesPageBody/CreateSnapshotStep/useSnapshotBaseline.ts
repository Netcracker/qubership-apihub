import { useMemo } from 'react'

import { useAppApiProcessorVersion } from '@netcracker/qubership-apihub-ui-shared/hooks/frontend-version/useVersionInfo'
import { useVersionProblemDetails } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/useVersionProblemDetails'
import {
  VERSION_PROBLEM_DIALOG_SURFACE,
  type VersionProblemDetails,
} from '@netcracker/qubership-apihub-ui-shared/hooks/versions/versionProblemDetails'
import type { IsFetching, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { agent } from '@netcracker/qubership-apihub-ui-shared/utils/version-info'

import type { VersionKey } from '@agents/entities/keys'
import type { Service } from '@agents/entities/services'
import { NO_PREVIOUS_VERSION_OPTION } from '@agents/entities/snapshots'
import { type BaselineOptions, toBaselineOptions } from '../../../baselineOptions'
import { useServices } from '../../../useServices'
import { getBaselineSearchesForText, getBaselineSearchesForVersion, getServicesWithFoundVersions } from './snapshotForm'
import { useFoundBaselineVersions } from './useFoundBaselineVersions'

export type SnapshotBaseline = Readonly<{
  /** The services with API documents, with the release versions that the searches found in their baseline packages. */
  services: ReadonlyArray<Service>
  areServicesLoading: IsLoading
  options: BaselineOptions
  /** The problem of the selected baseline version; a blocking one disables "Create Snapshot" and "Next". */
  problem: VersionProblemDetails
  isSearching: IsFetching
  /**
   * Whether the search of the selected version has answered, or the version needs none. Until then a service whose
   * baseline package holds the version can lack it in `services`.
   */
  isBaselineChecked: boolean
  /** Whether the search of the selected version failed after its retries. */
  isBaselineCheckFailed: boolean
  /** Runs the search of the selected version again. */
  recheckBaseline: () => void
}>

/**
 * The baseline versions of Create Snapshot, with `baseline` as the selected one. `searchText` searches the portal for
 * release versions, in the baseline packages whose versions discovery may list only in part.
 */
export function useSnapshotBaseline(baseline: VersionKey, searchText: string = ''): SnapshotBaseline {
  const [{ services: discoveredServices }, areServicesLoading] = useServices()
  const appApiProcessorVersion = useAppApiProcessorVersion(agent)

  // Create Snapshot lists only the services with API documents
  const servicesWithSpecs = useMemo(
    () => discoveredServices.filter(({ specs }) => isNotEmpty(specs)),
    [discoveredServices],
  )
  const textSearches = useMemo(
    () => getBaselineSearchesForText(servicesWithSpecs, searchText),
    [searchText, servicesWithSpecs],
  )
  const versionSearches = useMemo(
    () => getBaselineSearchesForVersion(servicesWithSpecs, baseline),
    [baseline, servicesWithSpecs],
  )
  const { found: foundByText, isFetching: isSearching } = useFoundBaselineVersions(textSearches)
  const {
    found: foundByVersion,
    isFound: isBaselineChecked,
    isFailed: isBaselineCheckFailed,
    refetch: recheckBaseline,
  } = useFoundBaselineVersions(versionSearches)

  const services = useMemo(
    () => getServicesWithFoundVersions(servicesWithSpecs, [...foundByText, ...foundByVersion]),
    [foundByText, foundByVersion, servicesWithSpecs],
  )

  const options = useMemo<BaselineOptions>(() => {
    // Every service counts, since a baseline version with errors blocks the whole snapshot
    const { versionKeys, flagsByVersionKey } = toBaselineOptions(services, undefined, appApiProcessorVersion)
    // A version that only a search found stays an option after the list closes, until its own search returns
    const isSelectedVersionListed = baseline === '' || baseline === NO_PREVIOUS_VERSION_OPTION ||
      versionKeys.includes(baseline)
    return {
      versionKeys: [NO_PREVIOUS_VERSION_OPTION, ...(isSelectedVersionListed ? [] : [baseline]), ...versionKeys],
      flagsByVersionKey: flagsByVersionKey,
    }
  }, [appApiProcessorVersion, baseline, services])

  const flags = options.flagsByVersionKey.get(baseline)
  const problem = useVersionProblemDetails({
    versionKey: baseline,
    hasErrors: flags?.hasErrors,
    changelogHasErrors: flags?.changelogHasErrors,
    apiProcessorVersion: flags?.apiProcessorVersion,
    surface: VERSION_PROBLEM_DIALOG_SURFACE.PUBLISH_PREVIOUS_VERSION,
    app: agent,
  })

  return {
    services: services,
    areServicesLoading: areServicesLoading,
    options: options,
    problem: problem,
    isSearching: isSearching,
    isBaselineChecked: isBaselineChecked,
    isBaselineCheckFailed: isBaselineCheckFailed,
    recheckBaseline: recheckBaseline,
  }
}
