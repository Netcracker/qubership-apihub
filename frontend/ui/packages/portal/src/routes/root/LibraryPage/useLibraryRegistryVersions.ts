import { useQuery, useQueryClient } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import type { LibraryRegistryVersionsDto } from '@portal/entities/libraries'
import { portalRequestJson } from '@portal/utils/requests'

const LIBRARY_REGISTRY_VERSIONS_LIMIT = 100

type LibraryRegistryVersionsResult = {
  versions: string[]
  isLoading: boolean
  error: Error | null
}

type RemoveLibraryRegistryVersions = () => void

const libraryRegistryVersionsQueryPrefix = (
  libraryId: Key,
): readonly ['library-registry-versions', Key] => ['library-registry-versions', libraryId]

const libraryRegistryVersionsQueryKey = (
  libraryId: Key,
  textFilter: string,
): readonly ['library-registry-versions', Key, string] => [...libraryRegistryVersionsQueryPrefix(libraryId), textFilter]

export function useLibraryRegistryVersions(libraryId: Key, textFilter: string): LibraryRegistryVersionsResult {
  const { data, isFetching, error } = useQuery<LibraryRegistryVersionsDto, Error>({
    queryKey: libraryRegistryVersionsQueryKey(libraryId, textFilter),
    queryFn: ({ signal }) => getLibraryRegistryVersions(libraryId, textFilter, signal),
    enabled: !!libraryId,
    refetchOnMount: 'always',
  })

  return { versions: data?.versions ?? [], isLoading: isFetching, error: error }
}

export function useRemoveLibraryRegistryVersions(libraryId: Key): RemoveLibraryRegistryVersions {
  const queryClient = useQueryClient()
  return () => queryClient.removeQueries({ queryKey: libraryRegistryVersionsQueryPrefix(libraryId) })
}

async function getLibraryRegistryVersions(
  libraryId: Key,
  textFilter: string,
  signal?: AbortSignal,
): Promise<LibraryRegistryVersionsDto> {
  const query = new URLSearchParams({
    textFilter: textFilter,
    limit: String(LIBRARY_REGISTRY_VERSIONS_LIMIT),
    page: '0',
  })
  return portalRequestJson<LibraryRegistryVersionsDto>(
    `/libraries/${encodeURIComponent(libraryId)}/registry-versions?${query}`,
    { method: 'GET' },
    { basePath: API_V1 },
    signal,
  )
}
