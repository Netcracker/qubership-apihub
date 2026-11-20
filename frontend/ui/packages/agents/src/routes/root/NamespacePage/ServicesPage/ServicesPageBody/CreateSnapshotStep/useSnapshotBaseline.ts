import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { RELEASE_VERSION_STATUS } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { useAppApiProcessorVersion } from '@netcracker/qubership-apihub-ui-shared/hooks/frontend-version/useVersionInfo'
import { getPackageVersionsList } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'
import { useVersionProblemDetails } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/useVersionProblemDetails'
import {
  VERSION_PROBLEM_DIALOG_SURFACE,
  type VersionProblemDetails,
} from '@netcracker/qubership-apihub-ui-shared/hooks/versions/versionProblemDetails'
import type { IsFetching, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { agent } from '@netcracker/qubership-apihub-ui-shared/utils/version-info'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

import { BASELINE_VERSIONS_PAGE_SIZE, type BaselineVersion, type Service } from '@agents/entities/services'
import { NO_PREVIOUS_VERSION_OPTION } from '@agents/entities/snapshots'
import { type BaselineOptions, toBaselineOptions } from '../../../baselineOptions'
import { useServices } from '../../../useServices'
import { useCreateSnapshotDraft } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import {
  baselineSearchesForText,
  baselineSearchesForVersion,
  type BaselineVersionSearch,
  type FoundBaselineVersions,
  withFoundBaselineVersions,
} from './snapshotForm'

const BASELINE_VERSION_SEARCH_QUERY_KEY = 'baseline-version-search-query-key'
// The stale time of the version lists of the portal
const BASELINE_VERSION_SEARCH_STALE_TIME = 30_000
const NO_FOUND_BASELINE_VERSIONS: ReadonlyArray<FoundBaselineVersions> = []

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

type FoundBaselineVersionsQuery = Readonly<{
  found: ReadonlyArray<FoundBaselineVersions>
  isFetching: IsFetching
  /** Whether the searches have answered; an empty list of searches counts as answered. */
  isFound: boolean
  isFailed: boolean
  refetch: () => void
}>

/**
 * The baseline versions of Create Snapshot. `searchText` searches the portal for release versions, in the baseline
 * packages whose versions discovery may list only in part.
 */
export function useSnapshotBaseline(searchText: string = ''): SnapshotBaseline {
  const [{ services: discoveredServices }, areServicesLoading] = useServices()
  const { createSnapshotDraft: { baseline } } = useCreateSnapshotDraft()
  const appApiProcessorVersion = useAppApiProcessorVersion(agent)

  // Create Snapshot lists only the services with API documents
  const servicesWithSpecs = useMemo(
    () => discoveredServices.filter(({ specs }) => isNotEmpty(specs)),
    [discoveredServices],
  )
  const textSearches = useMemo(
    () => baselineSearchesForText(servicesWithSpecs, searchText),
    [searchText, servicesWithSpecs],
  )
  const versionSearches = useMemo(
    () => baselineSearchesForVersion(servicesWithSpecs, baseline),
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
    () => withFoundBaselineVersions(servicesWithSpecs, [...foundByText, ...foundByVersion]),
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

// One query for the whole list keeps its data object while nothing changes, so the services above build once
function useFoundBaselineVersions(searches: ReadonlyArray<BaselineVersionSearch>): FoundBaselineVersionsQuery {
  const { data, isFetching, isSuccess, isError, refetch } = useQuery<ReadonlyArray<FoundBaselineVersions>, Error>({
    queryKey: [BASELINE_VERSION_SEARCH_QUERY_KEY, searches],
    queryFn: ({ signal }) => findBaselineVersions(searches, signal),
    enabled: isNotEmpty(searches),
    staleTime: BASELINE_VERSION_SEARCH_STALE_TIME,
  })
  return {
    found: data ?? NO_FOUND_BASELINE_VERSIONS,
    isFetching: isFetching,
    isFound: isEmpty(searches) || isSuccess,
    isFailed: isError,
    refetch: refetch,
  }
}

// Fails when the search of one package fails, so that React Query retries the whole list: a package left out would
// put its services under "Not Matching Baseline Version" for a version the package holds
async function findBaselineVersions(
  searches: ReadonlyArray<BaselineVersionSearch>,
  signal?: AbortSignal,
): Promise<ReadonlyArray<FoundBaselineVersions>> {
  const versionLists = await Promise.all(searches.map(({ packageKey, textFilter }) =>
    getPackageVersionsList(
      packageKey,
      [RELEASE_VERSION_STATUS],
      textFilter,
      undefined,
      undefined,
      BASELINE_VERSIONS_PAGE_SIZE,
      0,
      signal,
    ),
  ))
  return versionLists.map((versions, index) => ({
    packageKey: searches[index].packageKey,
    versions: versions.map(toFoundBaselineVersion),
  }))
}

function toFoundBaselineVersion(
  { key, hasErrors, changelogHasErrors, apiProcessorVersion }: PackageVersion,
): BaselineVersion {
  return {
    versionKey: getSplittedVersionKey(key).versionKey,
    hasErrors: hasErrors ?? false,
    changelogHasErrors: changelogHasErrors ?? false,
    apiProcessorVersion: apiProcessorVersion,
  }
}
