import { useQuery, useQueryClient } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { GROUP_KIND, type Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { getPackages } from '@netcracker/qubership-apihub-ui-shared/hooks/packages/usePackages'
import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import type { LibrariesDto, MavenLibraryDto } from '@portal/entities/libraries'
import { fetchAllPages } from '@portal/utils/pagination'
import { portalRequestJson } from '@portal/utils/requests'
import { useLibrariesEnabled } from './useLibrariesEnabled'
import { PACKAGES_QUERY_KEY } from './usePackages'

const LIBRARIES_QUERY_KEY = 'libraries'

type LibrariesOptions = {
  parentPackageId?: Key
  textFilter?: string
  onlyFavorite?: boolean
  includeDescendants?: boolean
}

type LibrariesResult = {
  libraries: MavenLibraryDto[]
  groups: Package[]
}

type InvalidateLibraries = () => Promise<void>

type UseLibrariesOptions = LibrariesOptions & {
  enabled?: boolean
}

type LibrariesQueryResult = LibrariesResult & {
  isLoading: boolean
  error: Error | null
}

export function useLibraries({
  parentPackageId,
  includeDescendants = false,
  onlyFavorite = false,
  textFilter = '',
  enabled: isEnabledByCaller = true,
}: UseLibrariesOptions): LibrariesQueryResult {
  const enabled = useLibrariesEnabled() && isEnabledByCaller
  const withDescendants = !!parentPackageId && includeDescendants
  const { data: groups = [], isInitialLoading: areGroupsLoading, error: groupsError } = useQuery<Package[], Error>({
    queryKey: [PACKAGES_QUERY_KEY, 'library-descendants', parentPackageId],
    queryFn: ({ signal }) => getDescendantGroups(parentPackageId!, signal),
    enabled: enabled && withDescendants,
  })
  const { data, isInitialLoading, error } = useQuery<LibrariesResult, Error>({
    queryKey: [
      LIBRARIES_QUERY_KEY,
      parentPackageId,
      includeDescendants,
      onlyFavorite,
      textFilter,
      withDescendants ? groups : undefined,
    ],
    queryFn: ({ signal }) =>
      getLibraries(
        {
          parentPackageId: parentPackageId,
          includeDescendants: includeDescendants,
          onlyFavorite: onlyFavorite,
          textFilter: textFilter,
        },
        withDescendants ? groups : [],
        signal,
      ),
    enabled: enabled && (!!parentPackageId || onlyFavorite) && (!withDescendants || !areGroupsLoading && !groupsError),
  })

  return {
    libraries: data?.libraries ?? [],
    groups: data?.groups ?? [],
    isLoading: withDescendants && areGroupsLoading || isInitialLoading,
    error: withDescendants ? groupsError ?? error : error,
  }
}

export function useInvalidateLibraries(): InvalidateLibraries {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: [LIBRARIES_QUERY_KEY] })
    queryClient.removeQueries({ queryKey: [LIBRARIES_QUERY_KEY], type: 'inactive' })
  }
}

async function getLibraries(
  options: LibrariesOptions,
  groups: Package[],
  signal?: AbortSignal,
): Promise<LibrariesResult> {
  const { parentPackageId } = options
  const parentIds = [...new Set([parentPackageId, ...groups.map(group => group.key)])]
  const results = await Promise.all(
    parentIds.map(parentId => getParentLibraries({ ...options, parentPackageId: parentId }, signal)),
  )

  return { libraries: results.flat(), groups: groups }
}

async function getParentLibraries({
  parentPackageId,
  textFilter = '',
  onlyFavorite = false,
}: LibrariesOptions, signal?: AbortSignal): Promise<MavenLibraryDto[]> {
  return fetchAllPages(async (page, limit) => {
    const query = new URLSearchParams({
      language: 'java',
      textFilter: textFilter,
      onlyFavorite: String(onlyFavorite),
      limit: String(limit),
      page: String(page),
    })
    if (parentPackageId) query.set('parentPackageId', parentPackageId)
    const result = await portalRequestJson<LibrariesDto>(
      `/libraries?${query}`,
      { method: 'GET' },
      { basePath: API_V1 },
      signal,
    )
    return result.libraries
  }, signal)
}

async function getDescendantGroups(parentPackageId: Key, signal?: AbortSignal): Promise<Package[]> {
  return fetchAllPages((page, limit) =>
    getPackages(
      GROUP_KIND,
      limit,
      false,
      page,
      parentPackageId,
      true,
      '',
      false,
      false,
      '',
      true,
      signal,
    ), signal)
}
