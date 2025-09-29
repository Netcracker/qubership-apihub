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

import { useQuery } from '@tanstack/react-query'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Namespaces, NamespacesDto } from '@netcracker/qubership-apihub-ui-shared/entities/namespaces'
import { EMPTY_NAMESPACES, toNamespaces } from '@netcracker/qubership-apihub-ui-shared/entities/namespaces'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { portalRequestJson } from '@apihub/utils/requests'

const NAMESPACES_QUERY_KEY = 'namespaces-query-key'

export function useNamespaces(agentKey: Key): [Namespaces, IsLoading] {
  const { data, isLoading } = useQuery<NamespacesDto, Error, Namespaces>({
    queryKey: [NAMESPACES_QUERY_KEY, agentKey],
    queryFn: () => getNamespaces(agentKey!),
    select: toNamespaces,
    enabled: !!agentKey,
  })

  return [
    data ?? EMPTY_NAMESPACES,
    isLoading,
  ]
}

export async function getNamespaces(agentKey: Key): Promise<NamespacesDto> {
  const agentId = encodeURIComponent(agentKey)

  return await portalRequestJson<NamespacesDto>(`/agents/${agentId}/namespaces`, {
    method: 'get',
  })
}
