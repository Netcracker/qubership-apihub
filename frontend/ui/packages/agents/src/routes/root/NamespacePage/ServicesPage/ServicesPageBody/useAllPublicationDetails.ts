import { useQuery } from '@tanstack/react-query'
import { useInvalidateSnapshotPublicationInfo } from '../../useSnapshotPublicationInfo'
import { useCreateSnapshotPublicationOptions } from '../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { useInvalidateSnapshots, useSnapshots } from '../../useSnapshots'
import { useMemo } from 'react'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
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

  return publishStatusOf(allPublishDetails, getPublishIds(config))
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
      if (publishStatusOf(data, publishIds) === COMPLETE_PUBLISH_STATUS) {
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

/**
 * The status of the publications of a config: `none` without a publication, `complete` when every publication
 * completed, `error` when every one ended and one failed, and `running` otherwise. A publication that the response
 * lacks counts as `none`, so a started config is `running` before its first status arrives.
 */
export function publishStatusOf(
  allPublishDetails: ReadonlyArray<PublishDetails>,
  publishIds: ReadonlyArray<PublishKey>,
): PublishStatus {
  if (isEmpty(publishIds)) {
    return NONE_PUBLISH_STATUS
  }
  const statuses = publishIds.map(publishId =>
    allPublishDetails.find(details => details.publishId === publishId)?.status ?? NONE_PUBLISH_STATUS,
  )
  if (statuses.every(status => status === COMPLETE_PUBLISH_STATUS)) {
    return COMPLETE_PUBLISH_STATUS
  }
  if (statuses.every(status => FINAL_PUBLISH_STATUSES.includes(status))) {
    return ERROR_PUBLISH_STATUS
  }
  return RUNNING_PUBLISH_STATUS
}
