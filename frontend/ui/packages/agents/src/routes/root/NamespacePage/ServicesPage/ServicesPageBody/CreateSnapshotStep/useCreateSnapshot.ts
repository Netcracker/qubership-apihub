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
import { useInvalidateSnapshots } from '../../../useSnapshots'
import type { IsError, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type {
  CreateSnapshotPublicationOptions} from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import {
  useCreateSnapshotPublicationOptions,
} from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { publishSnapshot } from '@apihub/entities/snapshots'
import type { PublishConfig} from '@apihub/entities/publish-config'
import { toPublishConfig } from '@apihub/entities/publish-config'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'

export function useCreateSnapshot(): [CreateSnapshot, IsLoading, IsSuccess, IsError, Error | null] {
  const { agentId, namespaceKey } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)
  const { setCreateSnapshotPublicationOptions } = useCreateSnapshotPublicationOptions()
  const invalidateSnapshots = useInvalidateSnapshots()

  const {
    mutate,
    isLoading,
    isSuccess,
    isError,
    error,
  } = useMutation<PublishConfig, Error, CreateSnapshotPublicationOptions>({
    mutationFn: async ({ name, baseline, serviceKeys }) => {
      const builderId = crypto.randomUUID()

      const publishConfigDto = await publishSnapshot(
        agentId!,
        namespaceKey!,
        workspaceKey!,
        true,
        false,
        name,
        baseline,
        serviceKeys,
        builderId,
      )

      return toPublishConfig(publishConfigDto, builderId)
    },
    onSuccess: (config, { name, baseline, serviceKeys }) => {
      setCreateSnapshotPublicationOptions({ name, baseline, serviceKeys, config })
      invalidateSnapshots()
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

export type CreateSnapshot = (options: CreateSnapshotPublicationOptions) => void
