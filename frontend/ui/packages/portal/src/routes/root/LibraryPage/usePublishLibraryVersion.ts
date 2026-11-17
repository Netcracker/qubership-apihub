import { useMutation } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import type { LibraryVersionDto, LibraryVersionPublishDto } from '@portal/entities/libraries'
import { LIBRARIES_API_BASE_PATH, portalRequestJson } from '@portal/utils/requests'
import { useInvalidateLibraryVersions } from './useLibraryVersions'

type PublishLibraryVersion = (value: LibraryVersionPublishDto) => void

type PublishLibraryVersionResult = {
  publishVersion: PublishLibraryVersion
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
  version: LibraryVersionDto | undefined
}

export function usePublishLibraryVersion(libraryId: Key): PublishLibraryVersionResult {
  const invalidateVersions = useInvalidateLibraryVersions(libraryId)
  const { mutate, data, isLoading, isSuccess, error } = useMutation<LibraryVersionDto, Error, LibraryVersionPublishDto>(
    {
      mutationFn: value => publishLibraryVersion(libraryId, value),
      onSuccess: invalidateVersions,
    },
  )

  return { publishVersion: mutate, version: data, isLoading: isLoading, isSuccess: isSuccess, error: error }
}

async function publishLibraryVersion(libraryId: Key, value: LibraryVersionPublishDto): Promise<LibraryVersionDto> {
  return portalRequestJson<LibraryVersionDto>(`/libraries/${encodeURIComponent(libraryId)}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  }, { basePath: LIBRARIES_API_BASE_PATH })
}
