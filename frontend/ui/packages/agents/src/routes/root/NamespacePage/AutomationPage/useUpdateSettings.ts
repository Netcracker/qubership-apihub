import { useMutation } from '@tanstack/react-query'
import type { Emails, Schedules } from '@agents/entities/settings'
import { updateSettings } from '@agents/entities/settings'
import { useParams } from 'react-router-dom'
import { useSetSettings } from './useSettings'
import type { IsError, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { AutodiscoveryStatus } from '@agents/entities/statuses'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import {
  useGetNcServicePrefix,
} from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

export function useUpdateSettings(): [UpdateSettings, IsLoading, IsSuccess, IsError] {
  const { agentId, namespaceKey } = useParams()
  const workspaceKey = useSearchParam(WORKSPACE_SEARCH_PARAM)
  const setSettings = useSetSettings()
  const ncServicePrefix = useGetNcServicePrefix()

  const { mutate, isLoading, isSuccess, isError } = useMutation<void, Error, UpdateSettingsOptions>({
    mutationFn: ({
      versionKey,
      previousVersionKey,
      autodiscoveryStatus,
      schedules,
      emailNotificationList,
      emailNotificationsEnabled,
    }) =>
      updateSettings(
        agentId!,
        namespaceKey!,
        workspaceKey!,
        versionKey,
        previousVersionKey,
        autodiscoveryStatus,
        schedules,
        emailNotificationsEnabled,
        emailNotificationList,
        ncServicePrefix,
      ),
    onSuccess: (_, {
      versionKey,
      previousVersionKey,
      autodiscoveryStatus,
      schedules,
      emailNotificationList,
      emailNotificationsEnabled,
    }) => setSettings({
      name: namespaceKey!,
      version: versionKey,
      previousVersion: previousVersionKey,
      autoDiscovery: autodiscoveryStatus,
      schedules: schedules,
      emailNotificationsEnabled: emailNotificationsEnabled,
      emailNotificationList: emailNotificationList,
    }),
  })

  return [
    mutate,
    isLoading,
    isSuccess,
    isError,
  ]
}

export type UpdateSettings = (options: UpdateSettingsOptions) => void

type UpdateSettingsOptions = {
  versionKey: VersionKey
  previousVersionKey: VersionKey
  autodiscoveryStatus: AutodiscoveryStatus
  schedules: Schedules
  emailNotificationsEnabled: boolean
  emailNotificationList: Emails
}
