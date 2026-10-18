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

import type { AgentKey, NamespaceKey, VersionKey, WorkspaceKey } from './keys'
import type { AutodiscoveryStatus } from './statuses'
import { NONE_DISCOVERY_STATUS } from './statuses'
import { API_V2, requestJson, requestVoid } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

export type Settings = Readonly<{
  name: string
  versionKey: VersionKey
  previousVersionKey: VersionKey
  autodiscoveryStatus: AutodiscoveryStatus
  schedules: Schedules
  emailNotificationsEnabled: boolean
  emailNotificationList: Emails
}>

export type SettingsDto = Readonly<{
  name: string
  version: VersionKey
  previousVersion: VersionKey
  autoDiscovery: AutodiscoveryStatus
  schedules: Schedules
  emailNotificationsEnabled: boolean
  emailNotificationList?: Emails
}>

export const EMPTY_SETTINGS: Settings = {
  name: '',
  versionKey: '',
  previousVersionKey: '',
  autodiscoveryStatus: NONE_DISCOVERY_STATUS,
  schedules: [],
  emailNotificationsEnabled: false,
  emailNotificationList: [],
}

export function toSettings(value: SettingsDto): Settings {
  return {
    name: value.name,
    versionKey: value.version,
    previousVersionKey: value.previousVersion,
    autodiscoveryStatus: value.autoDiscovery,
    schedules: value.schedules,
    emailNotificationsEnabled: value.emailNotificationsEnabled,
    emailNotificationList: value.emailNotificationList ?? [],
  }
}

export async function getSettings(
  agentId: AgentKey,
  namespaceKey: NamespaceKey,
  workspaceKey: WorkspaceKey,
  prefix: string,
): Promise<SettingsDto> {
  return await requestJson<SettingsDto>(`/agents/${agentId}/namespaces/${namespaceKey}/workspaces/${workspaceKey}/settings`, {
      method: 'get',
    },
    { basePath: `${prefix}${API_V2}` },
  )
}

export type UpdateSettingsRequestDto = SettingsDto

export type Cron = string
export type Schedules = Cron[]
export type Emails = string[]

export async function updateSettings(
  agentId: AgentKey,
  namespaceKey: NamespaceKey,
  workspaceKey: WorkspaceKey,
  versionKey: VersionKey,
  previousVersionKey: VersionKey,
  autodiscoveryStatus: AutodiscoveryStatus,
  schedules: Schedules,
  emailNotificationEnabled: boolean,
  emailNotificationList: Emails,
  prefix: string,
): Promise<void> {
  return await requestVoid(`/agents/${agentId}/namespaces/${namespaceKey}/workspaces/${workspaceKey}/settings`, {
      method: 'post',
      body: JSON.stringify(<UpdateSettingsRequestDto>{
        name: namespaceKey,
        version: versionKey,
        previousVersion: previousVersionKey,
        autoDiscovery: autodiscoveryStatus,
        schedules: schedules,
        emailNotificationsEnabled: emailNotificationEnabled,
        emailNotificationList: emailNotificationList,
      }),
    },
    { basePath: `${prefix}${API_V2}` },
  )
}
