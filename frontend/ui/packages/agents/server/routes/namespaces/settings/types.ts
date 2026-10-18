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

export type Cron = string
export type Schedules = Cron[]
export type Emails = string[]

export const NONE_AUTODISCOVERY_STATUS = 'none'
export const SCHEDULE_AUTODISCOVERY_STATUS = 'schedule'

export type AutodiscoveryStatus =
  | typeof NONE_AUTODISCOVERY_STATUS
  | typeof SCHEDULE_AUTODISCOVERY_STATUS

export type SettingsDto = Readonly<{
  name: string
  version: string
  previousVersion: string
  autoDiscovery: AutodiscoveryStatus
  schedules: Schedules
  emailNotificationsEnabled: boolean
  emailNotificationList?: Emails
}>
