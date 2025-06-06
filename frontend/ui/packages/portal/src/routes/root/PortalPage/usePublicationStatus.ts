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
import { generatePath } from 'react-router-dom'
import {
  API_V1,
  API_V2,
  API_V3,
  requestJson,
  STATUS_REFETCH_INTERVAL,
} from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/utils/types'
import {
  useShowErrorNotification,
  useShowInfoNotification,
  useShowWarningNotification,
} from '@apihub/routes/root/BasePage/Notification'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { getVersionPath, useNavigation } from '@apihub/routes/NavigationProvider'
import type { IsError, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useMemo } from 'react'
import { REST_API_TYPE } from '@netcracker/qubership-apihub-api-processor'
import { useDownloadPublicationReport } from './useDownloadPublicationReport'
import { useAsyncInvalidateVersionContent } from '../usePackageVersionContent'
import {
  useAsyncInvalidatePackageVersions,
} from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'
import { useAsyncInvalidatePackage } from '../usePackage'

const PUBLISH_STATUS_QUERY_KEY = 'publish-status-query-key'
const OPERATION_GROUP_PUBLISH_STATUS_QUERY_KEY = 'operation-group-publish-status-query-key'

export function usePublicationStatuses(
  packageId: Key,
  publishId: Key | undefined,
  versionId?: Key,
): [IsLoading, IsSuccess] {
  const showNotification = useShowInfoNotification()
  const showErrorNotification = useShowErrorNotification()

  const { data } = useQuery<PublishStatusDto, Error, PublishStatusDto>({
    queryKey: [PUBLISH_STATUS_QUERY_KEY, packageId, publishId],
    queryFn: () => getPublishStatus(packageId, publishId!),
    refetchInterval: data => (data?.status === RUNNING_PUBLISH_STATUS || data?.status === NONE_PUBLISH_STATUS ? STATUS_REFETCH_INTERVAL : false),
    onSuccess: (data) => {
      if (data.status === COMPLETE_PUBLISH_STATUS) {
        const linkToVersion = getVersionPath({
          packageKey: packageId!,
          versionKey: getSplittedVersionKey(versionId).versionKey,
          edit: false,
        })

        showNotification({
          message: 'The package version was copied',
          link: {
            name: 'Check it out',
            href: linkToVersion.pathname ?? '',
          },
        })
      }
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
    enabled: !!publishId,
  })

  const isPublishing = useMemo(
    () => data?.status === RUNNING_PUBLISH_STATUS || data?.status === NONE_PUBLISH_STATUS,
    [data?.status],
  )

  return [
    isPublishing,
    data?.status === COMPLETE_PUBLISH_STATUS,
  ]
}

export async function getPublishStatus(
  packageKey: Key,
  publishKey: Key,
): Promise<PublishStatusDto> {
  const packageId = encodeURIComponent(packageKey)
  const publishId = encodeURIComponent(publishKey)

  const pathPattern = '/packages/:packageId/publish/:publishId/status'
  return await requestJson<PublishStatusDto>(
    generatePath(pathPattern, { packageId, publishId }),
    { method: 'GET' },
    { basePath: API_V2 },
  )
}

export function useOperationGroupPublicationStatuses(
  packageId: Key,
  versionId: Key,
  groupName: string,
  publishId: Key,
): [IsLoading, IsSuccess] {
  const showNotification = useShowInfoNotification()
  const showErrorNotification = useShowErrorNotification()

  const { data } = useQuery<PublishStatusDto, Error, PublishStatusDto>({
    queryKey: [OPERATION_GROUP_PUBLISH_STATUS_QUERY_KEY, packageId, versionId, groupName, publishId],
    queryFn: () => getOperationGroupPublishStatus(packageId, versionId, groupName, publishId),
    refetchInterval: data => (data?.status === RUNNING_PUBLISH_STATUS || data?.status === NONE_PUBLISH_STATUS ? STATUS_REFETCH_INTERVAL : false),
    onSuccess: (data) => {
      if (data.status === COMPLETE_PUBLISH_STATUS) {
        const linkToVersion = getVersionPath({
          packageKey: packageId!,
          versionKey: getSplittedVersionKey(versionId).versionKey,
          edit: false,
        })

        showNotification({
          message: 'The package version was published',
          link: {
            name: 'Check it out',
            href: linkToVersion.pathname ?? '',
          },
        })
      }
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
    enabled: !!publishId,
  })

  const isPublishing = useMemo(
    () => data?.status === RUNNING_PUBLISH_STATUS || data?.status === NONE_PUBLISH_STATUS,
    [data?.status],
  )

  return [
    isPublishing,
    data?.status === COMPLETE_PUBLISH_STATUS,
  ]
}

export async function getOperationGroupPublishStatus(
  packageKey: Key,
  versionKey: Key,
  groupName: string,
  publishKey: Key,
): Promise<PublishStatusDto> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const publishId = encodeURIComponent(publishKey)
  const encodedGroupName = encodeURIComponent(groupName)
  const apiType = REST_API_TYPE

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/groups/:encodedGroupName/publish/:publishId/status'
  return await requestJson<PublishStatusDto>(
    generatePath(pathPattern, { packageId, versionId, encodedGroupName, apiType, publishId }),
    { method: 'GET' },
    { basePath: API_V3 },
  )
}

export function useDashboardVersionFromCSVPublicationStatuses(
  packageId: Key,
  publishId: Key | undefined,
  versionId: Key,
): [IsLoading, IsSuccess, IsError] {
  const { navigateToVersion } = useNavigation()
  const showInfoNotification = useShowInfoNotification()
  const showWarningNotification = useShowWarningNotification()
  const showErrorNotification = useShowErrorNotification()
  const [downloadPublicationReport] = useDownloadPublicationReport()
  const invalidateVersionContent = useAsyncInvalidateVersionContent()
  const invalidatePackageVersions = useAsyncInvalidatePackageVersions()
  const invalidatePackage = useAsyncInvalidatePackage()

  const { data: { status } = {} } = useQuery<PublishStatusDto, Error, PublishStatusDto>({
    queryKey: [PUBLISH_STATUS_QUERY_KEY, packageId, publishId],
    queryFn: () => getDashboardVersionFromCSVPublicationStatuses(packageId, publishId!),
    refetchInterval: data => (data?.status === RUNNING_PUBLISH_STATUS || data?.status === NONE_PUBLISH_STATUS ? STATUS_REFETCH_INTERVAL : false),
    onSuccess: async ({ status, message }) => {
      if (status === ERROR_PUBLISH_STATUS) {
        return showErrorNotification({ message: message })
      }
      if (status !== COMPLETE_PUBLISH_STATUS) {
        return
      }
      await invalidatePackageVersions()
      await invalidateVersionContent({
        packageKey: packageId,
        versionKey: versionId,
      })
      await invalidatePackage(packageId)
      navigateToVersion({ packageKey: packageId!, versionKey: versionId })

      if (message) {
        return showWarningNotification({
          message: `The dashboard version was published.\n${message}`,
          button: {
            title: 'Download report result',
            onClick: () => downloadPublicationReport({
              packageKey: packageId,
              versionKey: versionId,
              publishKey: publishId!,
            }),
          },
        })
      }

      return showInfoNotification({ message: 'The dashboard version was published' })
    },
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
    enabled: !!publishId,
  })

  const isPublishing = status === RUNNING_PUBLISH_STATUS || status === NONE_PUBLISH_STATUS

  return [
    isPublishing,
    status === COMPLETE_PUBLISH_STATUS,
    status === ERROR_PUBLISH_STATUS,
  ]
}

export async function getDashboardVersionFromCSVPublicationStatuses(
  packageKey: Key,
  publishKey: Key,
): Promise<PublishStatusDto> {
  const packageId = encodeURIComponent(packageKey)
  const publishId = encodeURIComponent(publishKey)

  const pathPattern = '/packages/:packageId/publish/:publishId/withOperationsGroup/status'
  return await requestJson<PublishStatusDto>(
    generatePath(pathPattern, { packageId, publishId }),
    { method: 'GET' },
    { basePath: API_V1 },
  )
}

export type PublishStatusDto = {
  publishId: string
  status: PublishStatus
  message: string
}

export const NONE_PUBLISH_STATUS = 'none'
export const RUNNING_PUBLISH_STATUS = 'running'
export const COMPLETE_PUBLISH_STATUS = 'complete'
export const ERROR_PUBLISH_STATUS = 'error'

export type PublishStatus =
  | typeof NONE_PUBLISH_STATUS
  | typeof RUNNING_PUBLISH_STATUS
  | typeof COMPLETE_PUBLISH_STATUS
  | typeof ERROR_PUBLISH_STATUS
