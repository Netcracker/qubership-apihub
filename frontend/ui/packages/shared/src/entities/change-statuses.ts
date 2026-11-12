export const MOVED_CHANGE_STATUS = 'moved'
export const MODIFIED_CHANGE_STATUS = 'modified'
export const EXCLUDED_CHANGE_STATUS = 'excluded'
export const DELETED_CHANGE_STATUS = 'deleted'
export const ADDED_CHANGE_STATUS = 'added'
export const INCLUDED_CHANGE_STATUS = 'included'
export const UNMODIFIED_CHANGE_STATUS = 'unmodified'

export type ChangeStatus =
  | typeof MOVED_CHANGE_STATUS
  | typeof MODIFIED_CHANGE_STATUS
  | typeof EXCLUDED_CHANGE_STATUS
  | typeof DELETED_CHANGE_STATUS
  | typeof ADDED_CHANGE_STATUS
  | typeof INCLUDED_CHANGE_STATUS
  | typeof UNMODIFIED_CHANGE_STATUS

export const STATUS_COLORS: Record<ChangeStatus, string> = {
  [MOVED_CHANGE_STATUS]: '#FFB02E',
  [MODIFIED_CHANGE_STATUS]: '#0068FF',
  [EXCLUDED_CHANGE_STATUS]: '#FF5260',
  [DELETED_CHANGE_STATUS]: '#FF5260',
  [ADDED_CHANGE_STATUS]: '#00BB5B',
  [INCLUDED_CHANGE_STATUS]: '#00BB5B',
  [UNMODIFIED_CHANGE_STATUS]: 'inherit',
}
