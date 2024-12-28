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
import { useParams } from 'react-router-dom'
import type { InvalidateQuery, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { Snapshots, SnapshotsDto } from '@apihub/entities/snapshots'
import { EMPTY_SNAPSHOTS, getSnapshots, toSnapshots } from '@apihub/entities/snapshots'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'

const SNAPSHOTS_QUERY_KEY = 'snapshots-query-key'

export function useSnapshots(): [Snapshots, IsLoading] {
  const { agentId, namespaceKey } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const { data, isLoading } = useQuery<SnapshotsDto, Error, Snapshots>({
    queryKey: [SNAPSHOTS_QUERY_KEY, agentId, namespaceKey, workspaceKey],
    queryFn: () => getSnapshots(agentId!, namespaceKey!, workspaceKey!),
    enabled: !!namespaceKey,
    select: toSnapshots,
  })

  return [
    data ?? EMPTY_SNAPSHOTS,
    isLoading,
  ]
}

export function useInvalidateSnapshots(): InvalidateQuery<void> {
  const { namespaceKey, agentId } = useParams()
  const client = useQueryClient()

  return () => client.invalidateQueries({
    queryKey: [SNAPSHOTS_QUERY_KEY, agentId, namespaceKey],
    refetchType: 'all',
  })
}
