import { useQuery } from '@tanstack/react-query'

import type { IsFetching } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

import { type BaselineVersionSearch, findBaselineVersions, type FoundBaselineVersions } from '@agents/entities/services'

const BASELINE_VERSION_SEARCH_QUERY_KEY = 'baseline-version-search-query-key'
const NO_FOUND_BASELINE_VERSIONS: ReadonlyArray<FoundBaselineVersions> = []

type FoundBaselineVersionsQuery = Readonly<{
  found: ReadonlyArray<FoundBaselineVersions>
  isFetching: IsFetching
  /** Whether the searches have answered; an empty list of searches counts as answered. */
  isFound: boolean
  isFailed: boolean
  refetch: () => void
}>

/**
 * Runs the searches of baseline versions in the portal. One query covers all of them, so its data stays one object
 * while the searches do not change, and the services built from it keep their identity.
 */
export function useFoundBaselineVersions(searches: ReadonlyArray<BaselineVersionSearch>): FoundBaselineVersionsQuery {
  const { data, isFetching, isSuccess, isError, refetch } = useQuery<ReadonlyArray<FoundBaselineVersions>, Error>({
    queryKey: [BASELINE_VERSION_SEARCH_QUERY_KEY, searches],
    queryFn: ({ signal }) => findBaselineVersions(searches, signal),
    enabled: isNotEmpty(searches),
  })
  return {
    found: data ?? NO_FOUND_BASELINE_VERSIONS,
    isFetching: isFetching,
    isFound: isEmpty(searches) || isSuccess,
    isFailed: isError,
    refetch: refetch,
  }
}
