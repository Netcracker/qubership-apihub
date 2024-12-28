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
import { useShowErrorNotification } from '../../../../BasePage/Notification'
import { PackageVersionBuilder } from '../../../package-version-builder'
import type { Filename } from '../../../package-version-builder-worker'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getAuthorization } from '@netcracker/qubership-apihub-ui-shared/utils/storages'
import type { BuildType, OperationsGroupExportFormat } from '@netcracker/qubership-apihub-api-processor'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

type ExportOperations = (options: Options) => void

type Options = {
  apiType: ApiType
  buildType: BuildType
  groupName: string
  packageKey: Key
  versionKey: Key
  format: OperationsGroupExportFormat
}

export function useOperationsExport(): [ExportOperations, IsLoading] {
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading } = useMutation<[Blob, Filename], Error, Options>({
    mutationFn: async ({ packageKey, versionKey, groupName, apiType, format, buildType }: Options) => {
      return await PackageVersionBuilder.exportOperations({
        packageKey: packageKey,
        versionKey: versionKey,
        groupName: groupName,
        apiType: apiType,
        buildType: buildType,
        format: format,
        authorization: getAuthorization(),
      })
    },
    onSuccess: ([blob, filename]) => {
      fileDownload(blob, filename)
    },
    onError: (error) => {
      showErrorNotification({ message: error.message })
    },
  })

  return [mutate, isLoading]
}
