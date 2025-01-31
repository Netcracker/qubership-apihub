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

import { useMutation } from '@tanstack/react-query'
import { generatePath } from 'react-router-dom'
import { useShowErrorNotification } from '../BasePage/Notification'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { API_V1, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { PackageId, VersionStatus } from '@netcracker/qubership-apihub-api-processor'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

type PublishDashboardVersionFromCSVData = {
  packageKey: Key
  value: {
    csvFile: File
    servicesWorkspaceId: PackageId
    version: Key
    status: VersionStatus
    previousVersion?: Key
    previousVersionPackageId?: Key
    versionLabels?: string[]
  }
}

type PublishDashboardVersionFromCSV = (date: PublishDashboardVersionFromCSVData) => void

type PublishResponse = {
  publishId: string
}

type PublishDashboardVersionFromCSVQueryContent = {
  publishId: string | undefined
  publish: PublishDashboardVersionFromCSV
  isPublishStarting: IsLoading
  isPublishStartedSuccessfully: IsSuccess
}

export function usePublishDashboardVersionFromCSV(): PublishDashboardVersionFromCSVQueryContent {
  const showErrorNotification = useShowErrorNotification()

  const {
    data,
    mutate,
    isLoading,
    isSuccess,
  } = useMutation<PublishResponse, Error, PublishDashboardVersionFromCSVData>({
    mutationFn: (data) => publishOperationGroupPackageVersion(data),
    onError: ({ message }) => {
      showErrorNotification({ message: message })
    },
  })

  return {
    publishId: data?.publishId,
    publish: mutate,
    isPublishStarting: isLoading,
    isPublishStartedSuccessfully: isSuccess,
  }
}

async function publishOperationGroupPackageVersion({
  packageKey,
  value,
}: PublishDashboardVersionFromCSVData): Promise<PublishResponse> {
  const packageId = encodeURIComponent(packageKey)
  const formData = makeFormData(value)

  const pathPattern = '/packages/:packageId/publish/withOperationsGroup'
  return await requestJson<PublishResponse>(generatePath(pathPattern, { packageId }), {
    method: 'POST',
    body: formData,
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    basePath: API_V1,
  })
}

function makeFormData({
  csvFile,
  servicesWorkspaceId,
  version,
  status,
  previousVersion,
  previousVersionPackageId,
  versionLabels,
}: PublishDashboardVersionFromCSVData['value']): FormData {
  const formData = new FormData()
  formData.append('csvFile', csvFile)
  formData.append('servicesWorkspaceId', servicesWorkspaceId)
  formData.append('version', version)
  formData.append('status', status)
  previousVersion && formData.append('previousVersion', previousVersion)
  previousVersionPackageId && formData.append('previousVersionPackageId', previousVersionPackageId)
  isNotEmpty(versionLabels) && formData.append('versionLabels', JSON.stringify(versionLabels))
  return formData
}
