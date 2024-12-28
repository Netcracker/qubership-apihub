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
import { getOperations } from '../useOperations'
import { generatePath } from 'react-router-dom'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { OperationsData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { IsError, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { portalRequestJson } from '@apihub/utils/requests'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type UseOperationChangelogOptions = {
  packageKey: Key
  versionKey: Key
  operationKey: Key
  apiType?: ApiType
  modelName: string
}

type GetModelUsages = (options: UseOperationChangelogOptions) => Promise<OperationsData>

export function useOperationsWithSameModel(): [GetModelUsages, IsLoading, IsError, Error | null] {
  const { showErrorNotification } = useEventBus()
  const {
    mutateAsync,
    isLoading,
    isError,
    error,
  } = useMutation<OperationsData, Error, UseOperationChangelogOptions>({
      mutationFn: async ({
        packageKey,
        versionKey,
        operationKey,
        apiType,
        modelName,
      }: UseOperationChangelogOptions) => {
        const modelUsages = await getModelUsages({
          packageKey: packageKey,
          versionKey: versionKey,
          operationKey: operationKey!,
          apiType: apiType as ApiType,
          modelName: modelName,
        })
        return getOperations({
          packageKey: packageKey,
          versionKey: versionKey,
          ids: modelUsages.map((usage) => usage.operationId),
          apiType: apiType as ApiType,
        })
      },
      onError: (error) => {
        showErrorNotification({ message: error?.message })
      },
    },
  )

  return [mutateAsync, isLoading, isError, error]
}

async function getModelUsages(options: UseOperationChangelogOptions): Promise<ModelUsages> {
  const {
    versionKey,
    packageKey,
    operationKey,
    apiType = DEFAULT_API_TYPE,
    modelName,
  } = options

  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const operationId = encodeURIComponent(operationKey)

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/operations/:operationId/models/:modelName/usages'
  const response = await portalRequestJson<ModelUsagesDto>(
    generatePath(pathPattern, { packageId, versionId, apiType, operationId, modelName }),
    {
      method: 'get',
    }, {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
  return toModelUsages(response)
}

export type ModelUsageDto = {
  operationId: Key
  modelNames: string[]
}

export type ModelUsagesDto = Readonly<{
  modelUsages: ReadonlyArray<ModelUsageDto>
}>

export type ModelUsage = {
  operationId: Key
  modelNames: string[]
}

export type ModelUsages = ReadonlyArray<ModelUsage>

export function toModelUsages(value: ModelUsagesDto): ModelUsages {
  return value.modelUsages.map(toModelUsage)
}

export function toModelUsage(value: ModelUsageDto): ModelUsage {
  const { operationId, modelNames } = value
  return {
    operationId,
    modelNames,
  }
}
