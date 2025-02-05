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
import { generatePath } from 'react-router-dom'
import { portalRequestBlob } from '@apihub/utils/requests'
import { useShowErrorNotification } from '@apihub/routes/root/BasePage/Notification'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V1 } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

export function useDownloadPublicationReport(): [DownloadPublicationReportFunction, IsLoading] {
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, Options>({
    mutationFn: (options) => downloadPublicationReport(options),
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading]
}

export const downloadPublicationReport = async ({
  packageKey,
  versionKey,
  publishKey,
}: Options): Promise<void> => {
  const packageId = encodeURIComponent(packageKey)
  const publishId = encodeURIComponent(publishKey)

  const pathPattern = '/packages/:packageId/publish/:publishId/withOperationsGroup/report'
  const response = await portalRequestBlob(
    generatePath(pathPattern, { packageId, publishId }),
    {
      method: 'GET',
    }, {
      basePath: API_V1,
    },
  )

  fileDownload(await response.blob(), `Report_${packageKey}_${versionKey}.csv`)
}

export type DownloadPublicationReportFunction = (options: Options) => void

type Options = {
  packageKey: Key
  versionKey: Key
  publishKey: Key
}
