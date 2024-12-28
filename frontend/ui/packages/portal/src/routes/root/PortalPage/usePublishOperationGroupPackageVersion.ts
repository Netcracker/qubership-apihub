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

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useMutation } from '@tanstack/react-query'
import { generatePath } from 'react-router-dom'
import { API_V3, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

type PublishOperationGroupPackageVersionData = {
  packageKey: Key
  versionKey: Key
  groupName: string
  apiType: ApiType
  value: {
    targetPackageKey: Key
    targetVersionKey: Key
    status: VersionStatus
    previousVersion: Key
    versionLabels: string[]
  }
}

type PublishOperationGroupPackageVersion = (date: PublishOperationGroupPackageVersionData) => void

type PublishResponse = {
  publishId: string
}

type PublishOperationGroupPackageVersionQueryContent = {
  publishId: string | undefined
  publishOperationGroupPackageVersion: PublishOperationGroupPackageVersion
  isLoading: IsLoading
  isSuccess: IsSuccess
}

export function usePublishOperationGroupPackageVersion(): PublishOperationGroupPackageVersionQueryContent {
  const { data, mutate, isLoading, isSuccess } = useMutation<PublishResponse, Error, PublishOperationGroupPackageVersionData>({
    mutationFn: (data) => publishOperationGroupPackageVersion(data),
  })

  return {
    publishId: data?.publishId,
    publishOperationGroupPackageVersion: mutate,
    isLoading: isLoading,
    isSuccess: isSuccess,
  }
}

async function publishOperationGroupPackageVersion(data: PublishOperationGroupPackageVersionData): Promise<PublishResponse> {
  const {
    packageKey,
    versionKey,
    groupName,
    apiType,
    value,
  } = data
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/groups/:groupName/publish'
  return await requestJson<PublishResponse>(generatePath(pathPattern, { packageId, versionId, apiType, groupName }), {
    method: 'POST',
    body: JSON.stringify({
      packageId: value.targetPackageKey,
      version: value.targetVersionKey,
      previousVersion: value.previousVersion,
      status: value.status,
      versionLabels: value.versionLabels,
    }),
  }, {
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    basePath: API_V3,
  })
}

