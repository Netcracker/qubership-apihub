/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useQuery } from '@tanstack/react-query'
import { useInvalidateSnapshotPublicationInfo } from '../../useSnapshotPublicationInfo'
import { useCreateSnapshotPublicationOptions } from '../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { useInvalidateSnapshots, useSnapshots } from '../../useSnapshots'
import { useMemo } from 'react'
import { EMPTY_ALL_PUBLISH_DETAILS, getPublishDetails } from '@apihub/entities/publish-details'
import {
  COMPLETE_PUBLISH_STATUS,
  ERROR_PUBLISH_STATUS,
  NONE_PUBLISH_STATUS,
  RUNNING_PUBLISH_STATUS,
} from '@apihub/entities/statuses'
import type { PublishDetails, PublishDetailsDto, PublishStatus } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import type { PublishConfig } from '@apihub/entities/publish-config'
import { STATUS_REFETCH_INTERVAL } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

const ALL_PUBLISH_DETAILS_QUERY_KEY = 'all-publish-details-query-key'

export function useAllPublicationDetails(options?: Partial<{
  config: PublishConfig
}>): [PublishDetails[]] {
  const { config } = options ?? {}
  const [snapshots, isLoading] = useSnapshots()
  const { createSnapshotPublicationOptions } = useCreateSnapshotPublicationOptions()
  const invalidateSnapshotPublishInfo = useInvalidateSnapshotPublicationInfo()
  const invalidateSnapshots = useInvalidateSnapshots()

  const { data } = useQuery<PublishDetailsDto[], Error, PublishDetails[]>({
    queryKey: [ALL_PUBLISH_DETAILS_QUERY_KEY, config],
    queryFn: () => {
      const publishIds = [...config!.serviceConfigs.map(({ publishId }) => publishId)]

      const snapshotPublishId = config!.snapshotConfig?.publishId

      snapshotPublishId && publishIds.push(snapshotPublishId)

      return getPublishDetails(snapshots.packageKey, publishIds)
    },
    refetchInterval: data => {
      if (data?.find(publishDetails => publishDetails.status === RUNNING_PUBLISH_STATUS || publishDetails.status === NONE_PUBLISH_STATUS)) {
        return STATUS_REFETCH_INTERVAL
      }
      return false
    },
    onSuccess: data => {
      if (data?.every(publishDetails => publishDetails.status === COMPLETE_PUBLISH_STATUS)) {
        invalidateSnapshotPublishInfo({ snapshotPublicationName: createSnapshotPublicationOptions.name })
        invalidateSnapshots()
      }
    },
    enabled: !!config && !isLoading,
  })

  return [
    data ?? EMPTY_ALL_PUBLISH_DETAILS,
  ]
}

export function useAllPublishDetailsStatus(options?: Partial<{
  config: PublishConfig
}>): PublishStatus {
  const { config } = options ?? {}
  const [allPublishDetails] = useAllPublicationDetails({ config })

  const isRunning = useMemo(
    () => allPublishDetails?.find(({ status }) => status === RUNNING_PUBLISH_STATUS),
    [allPublishDetails],
  )
  const isSuccess = useMemo(
    () => allPublishDetails?.every(({ status }) => status === COMPLETE_PUBLISH_STATUS),
    [allPublishDetails],
  )
  const isFailed = useMemo(
    () => allPublishDetails?.find(({ status }) => status === ERROR_PUBLISH_STATUS),
    [allPublishDetails],
  )

  if (isRunning) {
    return RUNNING_PUBLISH_STATUS
  }
  if (isSuccess) {
    return COMPLETE_PUBLISH_STATUS
  }
  if (isFailed) {
    return ERROR_PUBLISH_STATUS
  }

  return NONE_PUBLISH_STATUS
}
