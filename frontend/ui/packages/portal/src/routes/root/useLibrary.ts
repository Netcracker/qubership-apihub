import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import type { MavenLibraryCreateDto, MavenLibraryDto, MavenLibraryUpdateDto } from '@portal/entities/libraries'
import { requestJsonWithError } from '@portal/utils/requestJsonWithError'
import { portalRequestJson, portalRequestVoid } from '@portal/utils/requests'
import { useInvalidateLibraries } from './useLibraries'

type LibraryResult = {
  library: MavenLibraryDto | undefined
  isLoading: boolean
  error: Error | null
}

type CreateLibrary = (value: MavenLibraryCreateDto) => void
type UpdateLibrary = (value: MavenLibraryUpdateDto) => void
type DeleteLibrary = () => void
type FavorLibrary = (libraryId: Key) => void
type DisfavorLibrary = (libraryId: Key) => void
type InvalidateLibrary = (libraryId: Key) => Promise<void>

type FavorLibraryResult = {
  favorLibrary: FavorLibrary
  isLoading: boolean
  libraryId: Key | undefined
}

type DisfavorLibraryResult = {
  disfavorLibrary: DisfavorLibrary
  isLoading: boolean
  libraryId: Key | undefined
}

type UpdateLibraryResult = {
  updateLibrary: UpdateLibrary
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
}

type DeleteLibraryResult = {
  deleteLibrary: DeleteLibrary
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
}

type CreateLibraryResult = {
  createLibrary: CreateLibrary
  isLoading: boolean
  library: MavenLibraryDto | undefined
  error: Error | null
  clearError: () => void
}

const libraryQueryKey = (
  libraryId: Key | undefined,
): readonly ['library', Key | undefined] => ['library', libraryId]

export function useLibrary(libraryId: Key | undefined): LibraryResult {
  const { data, isLoading, error } = useQuery<MavenLibraryDto, Error>({
    queryKey: libraryQueryKey(libraryId),
    queryFn: ({ signal }) => getLibrary(libraryId!, signal),
    enabled: !!libraryId,
  })

  return { library: data, isLoading: isLoading, error: error }
}

export function useCreateLibrary(): CreateLibraryResult {
  const queryClient = useQueryClient()
  const invalidateLibraries = useInvalidateLibraries()
  const { mutate, data, isLoading, error, reset } = useMutation<MavenLibraryDto, Error, MavenLibraryCreateDto>({
    mutationFn: createLibrary,
    onSuccess: async library => {
      queryClient.setQueryData(libraryQueryKey(library.libraryId), library)
      await invalidateLibraries()
    },
  })

  return { createLibrary: mutate, isLoading: isLoading, library: data, error: error, clearError: reset }
}

export function useUpdateLibrary(libraryId: Key): UpdateLibraryResult {
  const client = useQueryClient()
  const invalidateLibraries = useInvalidateLibraries()
  const { mutate, isLoading, isSuccess, error } = useMutation<MavenLibraryDto, Error, MavenLibraryUpdateDto>({
    mutationFn: value => updateLibrary(libraryId, value),
    onSuccess: async library => {
      client.setQueryData(libraryQueryKey(libraryId), library)
      await invalidateLibraries()
    },
  })
  return { updateLibrary: mutate, isLoading: isLoading, isSuccess: isSuccess, error: error }
}

export function useDeleteLibrary(libraryId: Key): DeleteLibraryResult {
  const client = useQueryClient()
  const invalidateLibraries = useInvalidateLibraries()
  const { mutate, isLoading, isSuccess, error } = useMutation<void, Error>({
    mutationFn: () => deleteLibrary(libraryId),
    onSuccess: async () => {
      client.removeQueries({ queryKey: libraryQueryKey(libraryId) })
      await invalidateLibraries()
    },
  })
  return { deleteLibrary: mutate, isLoading: isLoading, isSuccess: isSuccess, error: error }
}

export function useFavorLibrary(): FavorLibraryResult {
  const invalidateLibrary = useInvalidateLibrary()
  const invalidateLibraries = useInvalidateLibraries()
  const { mutate, isLoading, variables } = useMutation<void, Error, Key>({
    mutationFn: favorLibrary,
    onSuccess: async (_, libraryId) => {
      await Promise.all([
        invalidateLibraries(),
        invalidateLibrary(libraryId),
      ])
    },
  })
  return { favorLibrary: mutate, isLoading: isLoading, libraryId: variables }
}

export function useDisfavorLibrary(): DisfavorLibraryResult {
  const invalidateLibrary = useInvalidateLibrary()
  const invalidateLibraries = useInvalidateLibraries()
  const { mutate, isLoading, variables } = useMutation<void, Error, Key>({
    mutationFn: disfavorLibrary,
    onSuccess: async (_, libraryId) => {
      await Promise.all([
        invalidateLibraries(),
        invalidateLibrary(libraryId),
      ])
    },
  })
  return { disfavorLibrary: mutate, isLoading: isLoading, libraryId: variables }
}

export function useInvalidateLibrary(): InvalidateLibrary {
  const queryClient = useQueryClient()
  return async libraryId => {
    await queryClient.invalidateQueries({ queryKey: libraryQueryKey(libraryId) })
    queryClient.removeQueries({ queryKey: libraryQueryKey(libraryId), type: 'inactive' })
  }
}

async function favorLibrary(libraryId: Key): Promise<void> {
  return portalRequestVoid(`/favorites/libraries/${encodeURIComponent(libraryId)}`, { method: 'PUT' }, {
    basePath: API_V1,
  })
}

async function disfavorLibrary(libraryId: Key): Promise<void> {
  return portalRequestVoid(
    `/favorites/libraries/${encodeURIComponent(libraryId)}`,
    { method: 'DELETE' },
    { basePath: API_V1 },
  )
}

async function createLibrary(value: MavenLibraryCreateDto): Promise<MavenLibraryDto> {
  return requestJsonWithError<MavenLibraryDto>('/libraries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  }, { basePath: API_V1 })
}

async function updateLibrary(libraryId: Key, value: MavenLibraryUpdateDto): Promise<MavenLibraryDto> {
  return portalRequestJson<MavenLibraryDto>(`/libraries/${encodeURIComponent(libraryId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  }, { basePath: API_V1 })
}

async function deleteLibrary(libraryId: Key): Promise<void> {
  return portalRequestVoid(`/libraries/${encodeURIComponent(libraryId)}`, { method: 'DELETE' }, { basePath: API_V1 })
}

async function getLibrary(libraryId: Key, signal?: AbortSignal): Promise<MavenLibraryDto> {
  return portalRequestJson<MavenLibraryDto>(
    `/libraries/${encodeURIComponent(libraryId)}`,
    {
      method: 'GET',
    },
    { basePath: API_V1, ignoreNotFound: true },
    signal,
  )
}
