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
import type { ApiAudience, ApiKind } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { ALL_API_KIND, API_AUDIENCE_ALL } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'

export function useDownloadOperationsAsExcel(): [DownloadOperationsAsExcelFunction, IsLoading] {
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, Options>({
    mutationFn: ({
      packageKey,
      version,
      apiType,
      textFilter,
      kind,
      apiAudience,
      tag,
      group,
      refPackageId,
      emptyTag,
      emptyGroup,
      onlyDeprecated,
    }) =>
      downloadOperationsAsExcel(packageKey!, version!, apiType!, textFilter, kind, apiAudience, tag, group, refPackageId, emptyTag, emptyGroup, onlyDeprecated),
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading]
}

export const downloadOperationsAsExcel = async (
  packageId: Key,
  versionId: Key,
  apiType: Key,
  textFilter?: Key,
  kind?: ApiKind,
  apiAudience?: ApiAudience,
  tag?: Key,
  group?: Key,
  refPackageId?: Key,
  emptyTag?: boolean,
  emptyGroup?: boolean,
  onlyDeprecated?: boolean,
): Promise<void> => {

  const queryParams = optionalSearchParams({
    textFilter: { value: textFilter },
    kind: { value: kind !== ALL_API_KIND ? kind : undefined },
    apiAudience: { value: apiAudience ?? API_AUDIENCE_ALL },
    tag: { value: tag },
    group: { value: group },
    emptyGroup: { value: emptyGroup },
    refPackageId: { value: refPackageId },
    emptyTag: { value: emptyTag },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/export/operations'
  const deprecatedPath = onlyDeprecated ? '/deprecated' : ''

  const response = await portalRequestBlob(
    `${generatePath(pathPattern, { packageId, versionId, apiType })}${deprecatedPath}?${queryParams}`,
    {
      method: 'GET',
    },
    {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )

  const getFilename = (): string => response.headers
    .get('content-disposition')!
    .split('filename=')[1]
    .split(';')[0]

  fileDownload(await response.blob(), getFilename())
}

type DownloadOperationsAsExcelFunction = (options: Options) => void

type Options = {
  packageKey: Key
  version: Key
  apiType: Key
  textFilter?: Key
  kind?: ApiKind
  apiAudience?: ApiAudience
  tag?: Key
  group?: Key
  refPackageId?: Key
  emptyTag?: boolean
  emptyGroup?: boolean
  onlyDeprecated?: boolean
}
