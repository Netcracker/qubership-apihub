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

import { generatePath } from 'react-router-dom'
import type { Key, VersionKey } from '../../../entities/keys'
import type { OperationChangesDto } from '../../../entities/operation-changelog'
import { DEFAULT_API_TYPE } from '../../../entities/operations'
import { getFullVersion } from '../../../utils/versions'
import { optionalSearchParams } from '../../../utils/search-params'
import { API_V2, requestJson } from '../../../utils/requests'
import { getPackageRedirectDetails } from '../../../utils/redirects'
import type { ChangeSeverity } from '../../../entities/change-severities'
import type { ApiType } from '../../../entities/api-types'

export type UseOperationChangelogOptions = {
  packageKey: Key
  versionKey: Key
  operationKey: Key
  apiType?: ApiType
  previousVersion?: VersionKey
  previousVersionPackageId?: Key
  severity?: ChangeSeverity[]
  enable?: boolean
}

export async function getOperationChangeLog(
  options: UseOperationChangelogOptions,
  signal?: AbortSignal,
): Promise<OperationChangesDto> {
  const {
    versionKey,
    packageKey,
    operationKey,
    apiType = DEFAULT_API_TYPE,
    previousVersion,
    previousVersionPackageId,
    severity,
  } = options

  const packageId = encodeURIComponent(packageKey)
  const fullVersion = await getFullVersion({ packageKey, versionKey }, signal)
  const versionId = encodeURIComponent(fullVersion.version)
  const operationId = encodeURIComponent(operationKey)

  const queryParams = optionalSearchParams({
    previousVersion: { value: previousVersion },
    previousVersionPackageId: { value: previousVersionPackageId },
    severity: { value: severity },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/operations/:operationId/changes'
  return await requestJson(
    `${generatePath(pathPattern, { packageId, versionId, apiType, operationId })}?${queryParams}`,
    { method: 'get' },
    {
      basePath: API_V2,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
    signal,
  )
}
