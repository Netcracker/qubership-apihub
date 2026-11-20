import type { QueryKey } from '@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { PackageKind, Packages } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import type { InvalidateQuery, IsFetching, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { EMPTY_PAGE_REFERER } from '@netcracker/qubership-apihub-ui-shared/entities/referer-pages-names'
import { getPackages } from '@netcracker/qubership-apihub-ui-shared/hooks/packages/usePackages'

const PACKAGES_QUERY_KEY = 'packages-query-key'

export function usePackages(options: {
  kind: PackageKind | PackageKind[]
  limit?: number
  onlyFavorite?: boolean
  textFilter?: string
  showParents?: boolean
  page?: number
  parentId?: string
  onlyShared?: boolean
  lastReleaseVersionDetails?: boolean
  versionLabel?: string
  showAllDescendants?: boolean
  enabled?: boolean
  refererPageKey?: string
}): [Packages, IsLoading, IsFetching, Error | null] {
  const {
    kind,
    limit = 100,
    onlyFavorite = false,
    textFilter = '',
    showParents = false,
    page = 0,
    parentId = '',
    onlyShared = false,
    lastReleaseVersionDetails = false,
    versionLabel = '',
    showAllDescendants = false,
    enabled = true,
    refererPageKey = EMPTY_PAGE_REFERER,
  } = options ?? {}

  const queryKey = [PACKAGES_QUERY_KEY, refererPageKey, kind, parentId, page, limit, onlyFavorite, textFilter, onlyShared, showAllDescendants, lastReleaseVersionDetails]
  const { data, isLoading, isFetching, error } = useQuery<Packages, Error, Packages>({
    queryKey: queryKey,
    queryFn: () => getPackages(kind, limit, onlyFavorite, page, parentId, showParents, textFilter, onlyShared, lastReleaseVersionDetails, versionLabel, showAllDescendants),
    enabled: enabled,
  })

  return [data ?? [], isLoading, isFetching, error]
}

export function useRefetchPackages(options: Partial<{
  queryKey: QueryKey
  refererPageName: string
}>): InvalidateQuery<void> {
  const {
    refererPageName,
    queryKey = [PACKAGES_QUERY_KEY, refererPageName],
  } = options
  const client = useQueryClient()
  return () => client.refetchQueries({ queryKey }).then()
}

export function useRefetchAllPackages(): InvalidateQuery<void> {
  return useRefetchPackages({ queryKey: [PACKAGES_QUERY_KEY] })
}
