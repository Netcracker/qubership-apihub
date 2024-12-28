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
import { useInvalidateServices } from '../../../useServices'
import type { IsError, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { runServiceDiscovery } from '@apihub/entities/services'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import type { WorkspaceKey } from '@apihub/entities/keys'

export function useRunDiscovery(): [RunDiscovery, IsLoading, IsSuccess, IsError] {
  const { agentId, namespaceKey } = useParams()
  const workspaceId = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const invalidateServices = useInvalidateServices()

  const { mutate, isLoading, isSuccess, isError } = useMutation<void, Error, WorkspaceKey | undefined>({
    mutationFn: ( workspaceKey ) => runServiceDiscovery(agentId!, namespaceKey!, workspaceKey ?? workspaceId!),
    onSuccess: invalidateServices,
  })

  return [
    mutate,
    isLoading,
    isSuccess,
    isError,
  ]
}

export type RunDiscovery = (workspaceKey?: WorkspaceKey) => void
