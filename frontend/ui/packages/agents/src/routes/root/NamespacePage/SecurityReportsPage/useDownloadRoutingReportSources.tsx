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

import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useMutation } from '@tanstack/react-query'
import type { Key } from '@apihub/entities/keys'
import fileDownload from 'js-file-download'
import { API_V3 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { APIHUB_NC_BASE_PATH } from '@netcracker/qubership-apihub-ui-shared/utils/urls'
import { ncCustomAgentsRequestBlob } from '@apihub/utils/requests'
import { generatePath } from 'react-router-dom'

export function useDownloadRoutingReportSources(): [DownloadRoutingReportSourcesFunction, IsLoading] {
  const { mutate, isLoading } = useMutation<void, Error, Options>({
    mutationFn: ({
      processKey,
    }) => downloadRoutingReportSources(processKey!),
  })
  return [mutate, isLoading]
}

export const downloadRoutingReportSources = async (
  processId: Key,
): Promise<void> => {

  const pathPattern = '/security/gatewayRouting/:processId/source'
  const response = await ncCustomAgentsRequestBlob(
    generatePath(pathPattern, { processId }),
    {
      method: 'GET',
    }, {
      basePath: `${APIHUB_NC_BASE_PATH}${API_V3}`,
    },
  )

  const getFilename = (): string => response.headers
    .get('content-disposition')!
    .split('filename=')[1]
    .split(';')[0]
    .slice(1, -1)

  fileDownload(await response.blob(), getFilename())
}

export type DownloadRoutingReportSourcesFunction = (options: Options) => void

type Options = {
  processKey: Key
}
