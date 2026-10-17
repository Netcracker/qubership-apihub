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
import {
  EMPTY_ALL_PUBLISH_DETAILS,
  getPublishDetails,
} from '@agents/entities/publish-details'
import type { PublishConfig } from '@agents/entities/publish-config'
import type { PublishKey } from '@agents/entities/keys'
import {
  COMPLETE_PUBLISH_STATUS,
  ERROR_PUBLISH_STATUS,
  NONE_PUBLISH_STATUS,
  type PublishDetails,
  type PublishDetailsDto,
  type PublishStatus,
  RUNNING_PUBLISH_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import { STATUS_REFETCH_INTERVAL } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

const ALL_PUBLISH_DETAILS_QUERY_KEY = 'all-publish-details-query-key'
const FINAL_PUBLISH_STATUSES: PublishStatus[] = [COMPLETE_PUBLISH_STATUS, ERROR_PUBLISH_STATUS]

export function useAllPublicationDetails(options?: Partial<{
  config: PublishConfig
}>): [PublishDetails[]] {
  const { config } = options ?? {}

  return [useAllPublicationDetailsQuery(config)]
}

export function useAllPublishDetailsStatus(options?: Partial<{
  config: PublishConfig
}>): PublishStatus {
  const { config } = options ?? {}
  const { createSnapshotPublicationOptions } = useCreateSnapshotPublicationOptions()
  const invalidateSnapshotPublishInfo = useInvalidateSnapshotPublicationInfo()
  const invalidateSnapshots = useInvalidateSnapshots()

  // Only the step status invalidates on completion. React Query calls onSuccess for each observer,
  // and the step tables observe the same poll.
  const allPublishDetails = useAllPublicationDetailsQuery(config, () => {
    invalidateSnapshotPublishInfo({ snapshotPublicationName: createSnapshotPublicationOptions.name })
    invalidateSnapshots()
  })

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

function useAllPublicationDetailsQuery(
  config: PublishConfig | undefined,
  // Called when every publication of the config is complete
  onComplete?: () => void,
): PublishDetails[] {
  const [snapshots, isLoading] = useSnapshots()
  const publishIds = useMemo(() => getPublishIds(config), [config])

  const { data } = useQuery<PublishDetailsDto[], Error, PublishDetails[]>({
    queryKey: [ALL_PUBLISH_DETAILS_QUERY_KEY, config],
    queryFn: () => getPublishDetails(snapshots.packageKey, publishIds),
    // The agents-backend registers the publications after it returns the config, so a response can miss
    // some of them, or be empty when the backend finds none. Polling continues until each one is final.
    refetchInterval: data => {
      const finalCount = data?.filter(({ status }) => FINAL_PUBLISH_STATUSES.includes(status)).length ?? 0
      return finalCount < publishIds.length ? STATUS_REFETCH_INTERVAL : false
    },
    onSuccess: data => {
      if (isEveryPublicationComplete(data, publishIds)) {
        onComplete?.()
      }
    },
    enabled: !!config && !isLoading,
  })

  return data ?? EMPTY_ALL_PUBLISH_DETAILS
}

function getPublishIds(config: PublishConfig | undefined): PublishKey[] {
  if (!config) {
    return []
  }

  const publishIds = config.serviceConfigs.map(({ publishId }) => publishId)
  const snapshotPublishId = config.snapshotConfig?.publishId

  return snapshotPublishId ? [...publishIds, snapshotPublishId] : publishIds
}

function isEveryPublicationComplete(data: PublishDetails[] | null, publishIds: PublishKey[]): boolean {
  return publishIds.every(publishId => !!data?.some(item => item.publishId === publishId && item.status === COMPLETE_PUBLISH_STATUS))
}
