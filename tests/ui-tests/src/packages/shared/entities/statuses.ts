export const RELEASE_VERSION_STATUS = 'release'
export const DRAFT_VERSION_STATUS = 'draft'

export type VersionStatuses =
  | typeof RELEASE_VERSION_STATUS
  | typeof DRAFT_VERSION_STATUS

export const RELEASE_VERSION_STATUS_TITLE = 'Release'
export const DRAFT_VERSION_STATUS_TITLE = 'Draft'

export const AGENT_SUCCESS_STATUS_ICON = 'CheckCircleRoundedIcon'
export const AGENT_WARNING_STATUS_ICON = 'ErrorRoundedIcon'
export const AGENT_ERROR_STATUS_ICON = 'CancelIcon'
