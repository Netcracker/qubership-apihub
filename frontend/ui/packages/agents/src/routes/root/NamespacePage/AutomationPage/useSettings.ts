import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import type { Settings, SettingsDto } from '@agents/entities/settings'
import { EMPTY_SETTINGS, getSettings, toSettings } from '@agents/entities/settings'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import {
  useGetNcServicePrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

const SETTINGS_QUERY_KEY = 'settings-query-key'

export function useSettings(): [Settings, IsLoading] {
  const { agentId, namespaceKey } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)
  const ncServicePrefix = useGetNcServicePrefix()
  const { data, isLoading } = useQuery<SettingsDto, Error, Settings>({
    queryKey: [SETTINGS_QUERY_KEY, agentId, namespaceKey, workspaceKey],
    queryFn: () => getSettings(agentId!, namespaceKey!, workspaceKey!, ncServicePrefix),
    enabled: !!namespaceKey && !!ncServicePrefix,
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
