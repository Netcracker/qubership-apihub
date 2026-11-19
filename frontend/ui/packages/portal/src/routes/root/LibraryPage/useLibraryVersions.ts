import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import {
  type LibraryVersion,
  LibraryVersionBuildStatuses,
  type LibraryVersionDto,
  type LibraryVersions,
  type LibraryVersionsDto,
  type LibraryVersionUpdateDto,
  toLibraryVersion,
} from '@portal/entities/libraries'
import { useInvalidateLibraryJavaApi } from '@portal/routes/root/LibraryPage/LibraryVersionPage/useLibraryJavaApi'
import { useRemoveLibraryAvailableVersions } from '@portal/routes/root/LibraryPage/useLibraryAvailableVersions'
import { useInvalidateLibraries } from '@portal/routes/root/useLibraries'
import { useInvalidateLibrary } from '@portal/routes/root/useLibrary'
import { fetchAllPages } from '@portal/utils/pagination'
import { LIBRARIES_API_BASE_PATH, portalRequestJson, portalRequestVoid } from '@portal/utils/requests'

const LIBRARY_VERSION_REFETCH_INTERVAL = 5000

type LibraryVersionsResult = {
  versions: LibraryVersion[]
  isLoading: boolean
  error: Error | null
}

type LibraryVersionResult = {
  version: LibraryVersion | undefined
  isLoading: boolean
  error: Error | null
}

type InvalidateLibraryVersions = () => Promise<void>
type UpdateLibraryVersion = (value: LibraryVersionUpdateDto) => void
type DeleteLibraryVersion = (version: string) => Promise<void>

type UpdateLibraryVersionResult = {
  updateVersion: UpdateLibraryVersion
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
}

type DeleteLibraryVersionResult = {
  deleteVersion: DeleteLibraryVersion
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
}

const libraryVersionsQueryKey = (
  libraryId: Key,
): readonly ['library-versions', Key] => ['library-versions', libraryId]

export function useLibraryVersions(libraryId: Key, enabled = true): LibraryVersionsResult {
  const { data, isInitialLoading, error } = useQuery<LibraryVersions, Error>({
    queryKey: libraryVersionsQueryKey(libraryId),
    queryFn: ({ signal }) => getLibraryVersions(libraryId, signal),
    enabled: enabled && !!libraryId,
    refetchInterval: (data, query) => {
      if (query.state.status === 'error') return false
      return data?.versions.some(isLibraryVersionBuilding) ? LIBRARY_VERSION_REFETCH_INTERVAL : false
    },
  })
  useRefreshAfterFinishedBuilds(libraryId, data?.versions.some(isLibraryVersionBuilding) ?? false)

  return { versions: data?.versions ?? [], isLoading: isInitialLoading, error: error }
}

export function useLibraryVersion(libraryId: Key, versionId: string): LibraryVersionResult {
  const { data, isLoading, error } = useQuery<LibraryVersion, Error>({
    queryKey: ['library-version', libraryId, versionId],
    queryFn: ({ signal }) => getLibraryVersion(libraryId, versionId, signal),
    enabled: !!libraryId && !!versionId,
    refetchInterval: (data, query) => {
      if (query.state.status === 'error') return false
      return isLibraryVersionBuilding(data) ? LIBRARY_VERSION_REFETCH_INTERVAL : false
    },
  })
  useRefreshAfterFinishedBuilds(libraryId, isLibraryVersionBuilding(data))
  return { version: data, isLoading: isLoading, error: error }
}

export function useInvalidateLibraryVersions(libraryId: Key): InvalidateLibraryVersions {
  const queryClient = useQueryClient()
  const removeAvailableVersions = useRemoveLibraryAvailableVersions(libraryId)
  const invalidateLibraries = useInvalidateLibraries()
  const invalidateLibrary = useInvalidateLibrary()
  return async () => {
    removeAvailableVersions()
    queryClient.removeQueries({ queryKey: libraryVersionsQueryKey(libraryId), type: 'inactive' })
    queryClient.removeQueries({ queryKey: ['library-version', libraryId], type: 'inactive' })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: libraryVersionsQueryKey(libraryId) }),
      queryClient.invalidateQueries({ queryKey: ['library-version', libraryId] }),
      invalidateLibraries(),
      invalidateLibrary(libraryId),
    ])
  }
}

export function useUpdateLibraryVersion(libraryId: Key, version: string): UpdateLibraryVersionResult {
  const invalidateVersions = useInvalidateLibraryVersions(libraryId)
  const { mutate, isLoading, isSuccess, error } = useMutation<LibraryVersion, Error, LibraryVersionUpdateDto>({
    mutationFn: value => updateLibraryVersion(libraryId, version, value),
    onSuccess: invalidateVersions,
  })
  return { updateVersion: mutate, isLoading: isLoading, isSuccess: isSuccess, error: error }
}

export function useDeleteLibraryVersion(libraryId: Key): DeleteLibraryVersionResult {
  const invalidateVersions = useInvalidateLibraryVersions(libraryId)
  const { mutateAsync, isLoading, isSuccess, error } = useMutation<void, Error, string>({
    mutationFn: version => deleteLibraryVersion(libraryId, version),
    onSuccess: invalidateVersions,
  })
  return { deleteVersion: mutateAsync, isLoading: isLoading, isSuccess: isSuccess, error: error }
}

export function isLibraryVersionBuilding(version: LibraryVersion | undefined): boolean {
  return version?.metadata?.buildStatus === LibraryVersionBuildStatuses.NOT_STARTED
}

function useRefreshAfterFinishedBuilds(libraryId: Key, isBuilding: boolean): void {
  const wasBuilding = useRef(isBuilding)
  const invalidateLibraries = useInvalidateLibraries()
  const invalidateLibrary = useInvalidateLibrary()
  const invalidateLibraryJavaApi = useInvalidateLibraryJavaApi()

  useEffect(() => {
    // The QueryClient never refetches on mount or focus, so build completion must refresh dependent queries.
    if (wasBuilding.current && !isBuilding) {
      void Promise.all([
        invalidateLibraries(),
        invalidateLibrary(libraryId),
        invalidateLibraryJavaApi(libraryId),
      ])
    }
    wasBuilding.current = isBuilding
  }, [libraryId, isBuilding, invalidateLibraries, invalidateLibrary, invalidateLibraryJavaApi])
}

// TODO(libraries-backend): The service has no PATCH for version status or labels;
// the Edit version dialog works only with the local mock until PATCH is supported.
async function updateLibraryVersion(
  libraryId: Key,
  version: string,
  value: LibraryVersionUpdateDto,
): Promise<LibraryVersion> {
  const result = await portalRequestJson<LibraryVersionDto>(
    `/libraries/${encodeURIComponent(libraryId)}/versions/${encodeURIComponent(version)}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) },
    { basePath: LIBRARIES_API_BASE_PATH },
  )
  return toLibraryVersion(result)
}

async function deleteLibraryVersion(libraryId: Key, version: string): Promise<void> {
  return portalRequestVoid(
    `/libraries/${encodeURIComponent(libraryId)}/versions/${encodeURIComponent(version)}`,
    { method: 'DELETE' },
    { basePath: LIBRARIES_API_BASE_PATH },
  )
}

async function getLibraryVersions(libraryId: Key, signal?: AbortSignal): Promise<LibraryVersions> {
  const versions = await fetchAllPages(async (page, limit) => {
    const result = await portalRequestJson<LibraryVersionsDto>(
      `/libraries/${encodeURIComponent(libraryId)}/versions?limit=${limit}&page=${page}`,
      { method: 'GET' },
      { basePath: LIBRARIES_API_BASE_PATH },
      signal,
    )
    return result.versions
  }, signal)
  return { versions: versions.map(toLibraryVersion) }
}

async function getLibraryVersion(libraryId: Key, versionId: string, signal?: AbortSignal): Promise<LibraryVersion> {
  const result = await portalRequestJson<LibraryVersionDto>(
    `/libraries/${encodeURIComponent(libraryId)}/versions/${encodeURIComponent(versionId)}`,
    { method: 'GET' },
    { basePath: LIBRARIES_API_BASE_PATH, ignoreNotFound: true },
    signal,
  )
  return toLibraryVersion(result)
}
