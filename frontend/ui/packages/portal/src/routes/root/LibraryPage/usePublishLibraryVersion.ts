import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { STATUS_REFETCH_INTERVAL } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import {
  type LibraryVersion,
  LibraryVersionBuildStatuses,
  type LibraryVersionDto,
  type LibraryVersionPublishDto,
  toLibraryVersion,
} from '@portal/entities/libraries'
import { useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'
import { useLibraryChangesSummary } from '@portal/routes/root/LibraryPage/LibraryVersionPage/useLibraryChanges'
import { requestJsonWithError } from '@portal/utils/requestJsonWithError'
import { LIBRARIES_API_BASE_PATH } from '@portal/utils/requests'
import { getLibraryVersion, isLibraryVersionBuilding, useInvalidateLibraryVersions } from './useLibraryVersions'

type PublishLibraryVersion = (value: LibraryVersionPublishDto) => void

type PublishLibraryVersionResult = {
  publishVersion: PublishLibraryVersion
  isPublishStarting: boolean
  isPublishStartedSuccessfully: boolean
  error: Error | null
  version: LibraryVersion | undefined
}

export function usePublishLibraryVersion(libraryId: Key): PublishLibraryVersionResult {
  const { mutate, data, isLoading, isSuccess, error } = useMutation<LibraryVersion, Error, LibraryVersionPublishDto>(
    {
      mutationFn: value => publishLibraryVersion(libraryId, value),
    },
  )

  return {
    publishVersion: mutate,
    version: data,
    isPublishStarting: isLoading,
    isPublishStartedSuccessfully: isSuccess,
    error: error,
  }
}

export function useLibraryVersionPublicationStatus(
  libraryId: Key,
  publishedVersion: LibraryVersion | undefined,
): [isPublishing: boolean, isPublished: boolean, isPublishError: boolean, buildError: Error | null] {
  const invalidateVersions = useInvalidateLibraryVersions(libraryId)
  const showSuccessNotification = useShowSuccessNotification()
  const handledVersion = useRef<LibraryVersion>()
  const [completedVersion, setCompletedVersion] = useState<LibraryVersion>()
  const version = publishedVersion?.version
  const { data, isError, error } = useQuery<LibraryVersion, Error>({
    queryKey: ['library-version-publication-status', libraryId, version],
    queryFn: ({ signal }) => getLibraryVersion(libraryId, version!, signal),
    enabled: !!publishedVersion,
    // A version deleted and published again must not reuse the finished status of the earlier build
    cacheTime: 0,
    refetchInterval: (data, query) => {
      if (query.state.status === 'error') return false
      return !data || isLibraryVersionBuilding(data) ? STATUS_REFETCH_INTERVAL : false
    },
  })
  const isBuildComplete = data?.metadata?.buildStatus === LibraryVersionBuildStatuses.COMPLETE
  const isBuildError = data?.metadata?.buildStatus === LibraryVersionBuildStatuses.ERROR
  const expectsComparison = isBuildComplete && !!publishedVersion?.previousVersion
  const { isLoading: isComparisonLoading } = useLibraryChangesSummary(
    libraryId,
    expectsComparison ? version : undefined,
    undefined,
    { expectsComparison: true },
  )
  const isWaitingForComparison = expectsComparison && isComparisonLoading
  const isPublishError = !!publishedVersion && (isBuildError || isError)
  const isPublished = !!publishedVersion && completedVersion === publishedVersion && !isPublishError

  useEffect(() => {
    if (!publishedVersion) {
      handledVersion.current = undefined
      return
    }
    if (!isPublishError && (!isBuildComplete || isWaitingForComparison)) return
    if (handledVersion.current === publishedVersion) return
    handledVersion.current = publishedVersion

    const finishPublication = async (): Promise<void> => {
      await invalidateVersions()
      if (isPublishError || handledVersion.current !== publishedVersion) return
      showSuccessNotification({ message: 'Library version has been saved' })
      setCompletedVersion(publishedVersion)
    }
    void finishPublication()
  }, [
    publishedVersion,
    isBuildComplete,
    isWaitingForComparison,
    isPublishError,
    invalidateVersions,
    showSuccessNotification,
  ])

  const isPublishing = !!publishedVersion && !isPublished && !isPublishError
  const buildError = isBuildError
    ? new Error(data?.metadata?.buildError || 'The library version build failed')
    : error
  return [isPublishing, isPublished, isPublishError, buildError]
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
