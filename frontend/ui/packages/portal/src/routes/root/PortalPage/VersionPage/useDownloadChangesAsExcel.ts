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
import fileDownload from 'js-file-download'
import type { Key } from '@apihub/entities/keys'
import { useShowErrorNotification } from '../../BasePage/Notification'
import { generatePath } from 'react-router-dom'
import { portalRequestBlob } from '@apihub/utils/requests'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { ApiAudience, ApiKind } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { ALL_API_KIND, API_AUDIENCE_ALL } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { API_V3 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'

export function useDownloadChangesAsExcel(): [DownloadChangesAsExcelFunction, IsLoading] {
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, Options>({
    mutationFn: (options) => downloadChangesAsExcel(options),
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading]
}

export const downloadChangesAsExcel = async (
  options: Options,
): Promise<void> => {
  const {
    packageKey,
    version,
    apiType,
    textFilter,
    apiKind,
    apiAudience = API_AUDIENCE_ALL,
    tag,
    severityFilter,
    refPackageId,
    group,
    emptyGroup,
    emptyTag,
    previousVersion,
    previousVersionPackageId,
  } = options
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(version)

  const queryParams = optionalSearchParams({
    textFilter: { value: textFilter },
    apiKind: { value: apiKind !== ALL_API_KIND ? apiKind : undefined },
    apiAudience: { value: apiAudience },
    tag: { value: tag },
    severity: { value: severityFilter },
    group: { value: group },
    emptyGroup: { value: emptyGroup },
    refPackageId: { value: refPackageId },
    emptyTag: { value: emptyTag },
    previousVersion: { value: previousVersion },
    previousVersionPackageId: { value: previousVersionPackageId },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/export/changes'
  const response = await portalRequestBlob(
    `${generatePath(pathPattern, { packageId, versionId, apiType })}?${queryParams}`,
    {
      method: 'GET',
    }, {
    basePath: API_V3,
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  },
  )

  const getFilename = (): string => response.headers
    .get('content-disposition')!
    .split('filename=')[1]
    .split(';')[0]

  fileDownload(await response.blob(), getFilename())
}

type DownloadChangesAsExcelFunction = (options: Options) => void

type Options = {
  packageKey: Key
  version: Key
  apiType: Key
  textFilter?: Key
  apiKind?: ApiKind
  apiAudience?: ApiAudience
  tag?: Key
  severityFilter?: ChangeSeverity[]
  group?: Key
  emptyGroup?: boolean
  refPackageId?: Key
  emptyTag?: boolean
  previousVersion?: string
  previousVersionPackageId?: string
}
