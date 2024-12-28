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
import { useParams } from 'react-router-dom'
import type { IsError, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { usePromoteVersionPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { publishSnapshot } from '@apihub/entities/snapshots'
import type { PublishConfig } from '@apihub/entities/publish-config'
import { toPublishConfig } from '@apihub/entities/publish-config'
import type { ServiceKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'

export function usePromoteVersion(): [PromoteVersion, IsLoading, IsSuccess, IsError, Error | null] {
  const { agentId, namespaceKey } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)
  const { setPromotePublicationOptions } = usePromoteVersionPublicationOptions()

  const { mutate, isLoading, isSuccess, isError, error } = useMutation<PublishConfig, Error, PromoteVersionOptions>({
    mutationFn: async ({ version, previousVersion, status, serviceKeys }) => {
      const builderId = crypto.randomUUID()

      const config = await publishSnapshot(
        agentId!,
        namespaceKey!,
        workspaceKey!,
        true,
        true,
        version,
        previousVersion,
        serviceKeys,
        builderId,
        status,
      )

      return toPublishConfig(config, builderId)
    },
    onSuccess: (config, { version, previousVersion, status, serviceKeys }) => {
      setPromotePublicationOptions({ version, previousVersion, status, serviceKeys, config })
    },
  })

  return [
    mutate,
    isLoading,
    isSuccess,
    isError,
    error,
  ]
}

export type PromoteVersion = (options: PromoteVersionOptions) => void

type PromoteVersionOptions = {
  version: VersionKey
  previousVersion: VersionKey
  serviceKeys: ServiceKey[]
  status: VersionStatus
}
