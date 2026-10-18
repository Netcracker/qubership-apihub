import type {
  DRAFT_VERSION_STATUS,
  DRAFT_VERSION_STATUS_TITLE,
  RELEASE_VERSION_STATUS,
  RELEASE_VERSION_STATUS_TITLE,
} from '@shared/entities'

export const INITIAL_STEP_STATUS = 'Initial'
export const RUNNING_STEP_STATUS = 'Running'
export const SUCCESS_STEP_STATUS = 'Success'
export const ERROR_STEP_STATUS = 'Error'

export type AgentVersionStatuses =
  | typeof DRAFT_VERSION_STATUS
  | typeof RELEASE_VERSION_STATUS

export type AgentVersionStatusTitles =
  | typeof DRAFT_VERSION_STATUS_TITLE
  | typeof RELEASE_VERSION_STATUS_TITLE
