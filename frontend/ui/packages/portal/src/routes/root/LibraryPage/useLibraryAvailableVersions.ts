import { useQuery, useQueryClient } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import type { LibraryAvailableVersionsDto } from '@portal/entities/libraries'
import { LIBRARIES_API_BASE_PATH, portalRequestJson } from '@portal/utils/requests'

const LIBRARY_AVAILABLE_VERSIONS_LIMIT = 100

type LibraryAvailableVersionsResult = {
  versions: string[]
  isLoading: boolean
  error: Error | null
}

type RemoveLibraryAvailableVersions = () => void

const libraryAvailableVersionsQueryPrefix = (
  libraryId: Key,
): readonly ['library-available-versions', Key] => ['library-available-versions', libraryId]

const libraryAvailableVersionsQueryKey = (
  libraryId: Key,
  textFilter: string,
): readonly ['library-available-versions', Key, string] => [
  ...libraryAvailableVersionsQueryPrefix(libraryId),
  textFilter,
]

export function useLibraryAvailableVersions(libraryId: Key, textFilter: string): LibraryAvailableVersionsResult {
  const { data, isFetching, error } = useQuery<LibraryAvailableVersionsDto, Error>({
    queryKey: libraryAvailableVersionsQueryKey(libraryId, textFilter),
    queryFn: ({ signal }) => getLibraryAvailableVersions(libraryId, textFilter, signal),
    enabled: !!libraryId,
    refetchOnMount: 'always',
  })

  return { versions: data?.versions.map(version => version.version) ?? [], isLoading: isFetching, error: error }
}

export function useRemoveLibraryAvailableVersions(libraryId: Key): RemoveLibraryAvailableVersions {
  const queryClient = useQueryClient()
  return () => queryClient.removeQueries({ queryKey: libraryAvailableVersionsQueryPrefix(libraryId) })
}

async function getLibraryAvailableVersions(
  libraryId: Key,
  textFilter: string,
  signal?: AbortSignal,
): Promise<LibraryAvailableVersionsDto> {
  const query = new URLSearchParams({
    textFilter: textFilter,
    limit: String(LIBRARY_AVAILABLE_VERSIONS_LIMIT),
    page: '0',
  })
  return portalRequestJson<LibraryAvailableVersionsDto>(
    `/libraries/${encodeURIComponent(libraryId)}/available-versions?${query}`,
    { method: 'GET' },
    { basePath: LIBRARIES_API_BASE_PATH },
    signal,
  )
}
