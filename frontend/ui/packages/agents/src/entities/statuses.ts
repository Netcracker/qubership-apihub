export const NONE_DISCOVERY_STATUS = 'none'
export const RUNNING_DISCOVERY_STATUS = 'running'
export const COMPLETE_DISCOVERY_STATUS = 'complete'
export const ERROR_DISCOVERY_STATUS = 'error'

export type DiscoveryStatus =
  | typeof NONE_DISCOVERY_STATUS
  | typeof RUNNING_DISCOVERY_STATUS
  | typeof COMPLETE_DISCOVERY_STATUS
  | typeof ERROR_DISCOVERY_STATUS

export const NONE_AUTODISCOVERY_STATUS = 'none'
export const SCHEDULE_AUTODISCOVERY_STATUS = 'schedule'

export type AutodiscoveryStatus =
  | typeof NONE_AUTODISCOVERY_STATUS
  | typeof SCHEDULE_AUTODISCOVERY_STATUS
