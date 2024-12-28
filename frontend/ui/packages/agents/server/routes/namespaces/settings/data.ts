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

import type { Writeable } from '../../../types'
import type { SettingsDto } from './types'

export const SETTINGS_DTO: Writeable<SettingsDto> = {
  name: 'ap-devops',
  version: '2.8.0',
  previousVersion: '2.7.0',
  autoDiscovery: 'none',
  schedules: ['30 0 * * *'],
  emailNotificationsEnabled: true,
  emailNotificationList: ['john.williams@example.com'],
}
