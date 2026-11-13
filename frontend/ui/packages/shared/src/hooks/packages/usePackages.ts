import type { QueryKey } from '@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toPackage } from './usePackage'
import type { PackageKind, Packages, PackagesDto } from '../../entities/packages'
import type { InvalidateQuery, IsFetching, IsLoading } from '../../utils/aliases'
import { EMPTY_PAGE_REFERER } from '../../entities/referer-pages-names'
import { optionalSearchParams } from '../../utils/search-params'
import { requestJson } from '../../utils/requests'

const PACKAGES_QUERY_KEY = 'packages-query-key'

type PackagesQueryState = {
  packages: Packages
  isLoading: IsLoading
  isFetching: IsFetching
  error: Error | null
}

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
  refererPageName?: string
}): PackagesQueryState {
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
    refererPageName = EMPTY_PAGE_REFERER,
  } = options ?? {}

  const queryKey = [PACKAGES_QUERY_KEY, refererPageName, kind, parentId, page, limit, onlyFavorite, textFilter, onlyShared, showAllDescendants, lastReleaseVersionDetails]
  const { data: packages = [], isLoading, isFetching, error } = useQuery<Packages, Error, Packages>({
    queryKey: queryKey,
    queryFn: () => getPackages(kind, limit, onlyFavorite, page, parentId, showParents, textFilter, onlyShared, lastReleaseVersionDetails, versionLabel, showAllDescendants),
    enabled: enabled,
  })

  return { packages, isLoading, isFetching, error }
}

export async function getPackages(
  kind: PackageKind | PackageKind[],
  limit: number,
  onlyFavorite: boolean,
  page: number,
  parentId: string,
  showParents: boolean,
  textFilter: string,
  onlyShared: boolean,
  lastReleaseVersionDetails: boolean,
  versionLabel: string,
  showAllDescendants: boolean,
  signal?: AbortSignal,
): Promise<Packages> {

  const searchParam = optionalSearchParams({
    kind: { value: kind.toString() },
    limit: { value: limit },
    onlyFavorite: { value: onlyFavorite },
    onlyShared: { value: onlyShared },
    page: { value: page },
    parentId: { value: parentId },
    showParents: { value: showParents },
    textFilter: { value: textFilter },
    lastReleaseVersionDetails: { value: lastReleaseVersionDetails },
    versionLabel: { value: versionLabel },
    showAllDescendants: { value: showAllDescendants },
  })

  return toPackages(await requestJson<PackagesDto>(`/api/v2/packages?${searchParam}`, {
    method: 'GET',
  }, {}, signal))
}

export function toPackages(value: PackagesDto): Packages {
  return value?.packages.map((pack) => toPackage(pack))
}

export function useInvalidatePackages(options: Partial<{
  queryKey: QueryKey
  refererPageName: string
}>): InvalidateQuery<void> {
  const {
    refererPageName = EMPTY_PAGE_REFERER,
    queryKey = [PACKAGES_QUERY_KEY, refererPageName],
  } = options
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey }).then()
}
