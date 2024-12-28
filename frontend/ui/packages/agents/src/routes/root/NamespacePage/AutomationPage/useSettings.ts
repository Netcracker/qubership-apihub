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
import type { Settings, SettingsDto } from '@apihub/entities/settings'
import { EMPTY_SETTINGS, getSettings, toSettings } from '@apihub/entities/settings'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'

const SETTINGS_QUERY_KEY = 'settings-query-key'

export function useSettings(): [Settings, IsLoading] {
  const { agentId, namespaceKey } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const { data, isLoading } = useQuery<SettingsDto, Error, Settings>({
    queryKey: [SETTINGS_QUERY_KEY, agentId, namespaceKey, workspaceKey],
    queryFn: () => getSettings(agentId!, namespaceKey!, workspaceKey!),
    enabled: !!namespaceKey,
    select: toSettings,
  })

  return [
    data ?? EMPTY_SETTINGS,
    isLoading,
  ]
}

export function useSetSettings(): SetSettings {
  const { agentId, namespaceKey } = useParams()
  const client = useQueryClient()

  return (settings: SettingsDto) => {
    client.setQueryData<SettingsDto>([SETTINGS_QUERY_KEY, agentId, namespaceKey], prevSettings => {
      if (!prevSettings) {
        return prevSettings
      }
      return settings
    })
  }
}

type SetSettings = (value: SettingsDto) => void
