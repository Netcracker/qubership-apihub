import type { Writeable } from '../../../types'
import type { SettingsDto } from './types'

export const SETTINGS_DTO: Writeable<SettingsDto> = {
  name: 'ap-devops',
  version: '2.8.0',
  previousVersion: '2.7.0',
  autoDiscovery: 'none',
  schedules: ['30 0 * * *'],
  emailNotificationsEnabled: true,
  emailNotificationList: ['john.doe@example.com'],
}
