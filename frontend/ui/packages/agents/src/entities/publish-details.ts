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

import type { PublishStatus } from './statuses'
import { NONE_PUBLISH_STATUS } from './statuses'
import type { PackageKey, PublishKey } from './keys'

import { generatePath } from 'react-router-dom'
import { ncCustomAgentsRequestJson, ncCustomAgentsRequestVoid } from '@apihub/utils/requests'
import { API_V2 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { SetPublicationDetailsOptions } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'

export type PublishDetails = PublishDetailsDto

export type PublishDetailsDto = {
  publishId: PublishKey
  status: PublishStatus
  message?: string
}

export const EMPTY_PUBLISH_DETAILS: PublishDetails = {
  publishId: '',
  status: NONE_PUBLISH_STATUS,
}

export const EMPTY_ALL_PUBLISH_DETAILS: PublishDetails[] = [
  EMPTY_PUBLISH_DETAILS,
]

export async function getPublishDetails(
  packageKey: PackageKey,
  publishKeys: PublishKey[],
): Promise<PublishDetails[]> {
  const packageId = encodeURIComponent(packageKey)

  const pathPattern = '/packages/:packageId/publish/statuses'
  return await ncCustomAgentsRequestJson<PublishDetails[]>(generatePath(pathPattern, { packageId }), {
      method: 'post',
      body: JSON.stringify({
        publishIds: publishKeys,
      }),
    },
    {
      basePath: API_V2,
      ignoreNotFound: true,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}

// TODO 23.08.23 // Check it later, why there is optional builderId here
type SetPublicationDetailsOptionsForAgent = Omit<SetPublicationDetailsOptions, 'builderId'> & { builderId?: string }

export async function setPublicationDetails(options: SetPublicationDetailsOptionsForAgent): Promise<void> {
  const {
    packageKey,
    publishKey,
    status,
    authorization,
    builderId,
    abortController,
    data,
    errors,
  } = options
  const packageId = encodeURIComponent(packageKey)
  const publishId = encodeURIComponent(publishKey)

  const formData = new FormData()
  formData.append('status', status)
  builderId && formData.append('builderId', builderId)
  errors && formData.append('errors', errors)
  data && formData.append('data', data, 'package.zip')

  const signal = abortController?.signal
  const pathPattern = '/packages/:packageId/publish/:publishId/status'
  return await ncCustomAgentsRequestVoid(generatePath(pathPattern, { packageId, publishId }), {
      method: 'post',
      body: formData,
      headers: { authorization },
      signal: signal,
    },
    {
      basePath: API_V2,
      ignoreNotFound: true,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}
