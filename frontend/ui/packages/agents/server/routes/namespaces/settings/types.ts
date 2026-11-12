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
