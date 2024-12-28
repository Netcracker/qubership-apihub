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

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Services, ServicesDto } from '@apihub/entities/services'
import { EMPTY_SERVICES, getServices, toServices } from '@apihub/entities/services'
import { useParams } from 'react-router-dom'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { RUNNING_DISCOVERY_STATUS } from '@apihub/entities/statuses'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { STATUS_REFETCH_INTERVAL } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

const SERVICES_QUERY_KEY = 'services-query-key'

export function useServices(options?: {
  onlyWithSpecs: boolean
}): [Services, IsLoading] {
  const { agentId, namespaceKey } = useParams()
  const { onlyWithSpecs } = options ?? {}
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const { data, isLoading } = useQuery<ServicesDto, Error, Services>({
    queryKey: [SERVICES_QUERY_KEY, agentId, namespaceKey, workspaceKey, onlyWithSpecs],
    queryFn: () => getServices(agentId!, namespaceKey!, workspaceKey!, onlyWithSpecs),
    enabled: !!namespaceKey,
    refetchInterval: data => (data?.status === RUNNING_DISCOVERY_STATUS ? STATUS_REFETCH_INTERVAL : false),
    select: toServices,
  })

  return [
    data ?? EMPTY_SERVICES,
    isLoading,
  ]
}

export function useInvalidateServices(): InvalidateQuery<void> {
  const { agentId, namespaceKey } = useParams()
  const client = useQueryClient()

  return () => client.invalidateQueries({
    queryKey: [SERVICES_QUERY_KEY, agentId, namespaceKey],
    refetchType: 'all',
  })
}
