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
import { useShowErrorNotification } from '@apihub/routes/root/BasePage/Notification'
import { getAuthorization } from '@netcracker/qubership-apihub-ui-shared/utils/storages'
import { fetchExportTemplate } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export function useDownloadExportTemplate(): [DownloadExportTemplate, IsLoading] {
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<void, Error, Options>({
    mutationFn: ({ packageKey, version, apiType, groupName }) =>
      downloadExportTemplate(packageKey, version, apiType, groupName),
    onError: (error) => {
      showErrorNotification({ message: error?.message })
    },
  })

  return [mutate, isLoading]
}

async function downloadExportTemplate(
  packageKey: Key,
  versionKey: Key,
  apiType: ApiType,
  groupName: string,
): Promise<void> {
  const [content, fileName] = await fetchExportTemplate(packageKey, versionKey, apiType, groupName, getAuthorization())
  fileDownload(content, fileName)
}

type DownloadExportTemplate = (options: Options) => void

type Options = {
  packageKey: Key
  version: Key
  groupName: string
  apiType: ApiType
}
