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
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { API_V2, requestJson } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

export type SystemStatsDto = Readonly<{
  versions: number
  operations: number
}>

export type SystemStats = SystemStatsDto

const SYSTEM_STATS_QUERY_KEY = 'system-stats-query-key'

export function useSystemStats(): [SystemStats | null, IsLoading] {
  const { data, isLoading } = useQuery<SystemStatsDto, Error, SystemStats>({
    queryKey: [SYSTEM_STATS_QUERY_KEY],
    queryFn: () => getSystemStats(),
    // Older backends do not provide this endpoint, so fail fast and hide the stats
    retry: false,
  })

  return [data ?? null, isLoading]
}

async function getSystemStats(): Promise<SystemStatsDto> {
  return await requestJson<SystemStatsDto>(
    '/system/stats',
    { method: 'GET' },
    { basePath: API_V2 },
  )
}
