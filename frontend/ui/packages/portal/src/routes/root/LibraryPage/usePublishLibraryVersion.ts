import { useMutation } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import {
  type LibraryVersion,
  type LibraryVersionDto,
  type LibraryVersionPublishDto,
  toLibraryVersion,
} from '@portal/entities/libraries'
import { useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'
import { requestJsonWithError } from '@portal/utils/requestJsonWithError'
import { LIBRARIES_API_BASE_PATH } from '@portal/utils/requests'
import { useInvalidateLibraryVersions } from './useLibraryVersions'

type PublishLibraryVersion = (value: LibraryVersionPublishDto) => void

type PublishLibraryVersionResult = {
  publishVersion: PublishLibraryVersion
  isLoading: boolean
  isSuccess: boolean
  error: Error | null
  version: LibraryVersion | undefined
}

export function usePublishLibraryVersion(libraryId: Key): PublishLibraryVersionResult {
  const invalidateVersions = useInvalidateLibraryVersions(libraryId)
  const showSuccessNotification = useShowSuccessNotification()
  const { mutate, data, isLoading, isSuccess, error } = useMutation<LibraryVersion, Error, LibraryVersionPublishDto>(
    {
      mutationFn: value => publishLibraryVersion(libraryId, value),
      // Notify before the refresh: on the empty library page the refreshed versions redirect to the new version and
      // unmount the dialog before it sees isSuccess
      onSuccess: () => {
        showSuccessNotification({ message: 'Library version has been saved' })
        return invalidateVersions()
      },
    },
  )

  return { publishVersion: mutate, version: data, isLoading: isLoading, isSuccess: isSuccess, error: error }
}

// Like Create, the dialog shows request errors itself (field errors, or its Alert), so the request reports none:
// the service answers 3103 with a 404, which the default handling would turn into a full error page
async function publishLibraryVersion(libraryId: Key, value: LibraryVersionPublishDto): Promise<LibraryVersion> {
  const result = await requestJsonWithError<LibraryVersionDto>(`/libraries/${encodeURIComponent(libraryId)}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  }, { basePath: LIBRARIES_API_BASE_PATH })
  return toLibraryVersion(result)
}
