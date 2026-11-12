export const BADGE_KIND_DEFAULT = 'default'
export const BADGE_KIND_DEFAULT_OUTLINE = 'default-outline'
export const BADGE_KIND_INFO = 'info'
export const BADGE_KIND_WARNING = 'warning'
export const BADGE_KIND_ALTERNATIVE_INFO = 'alt-info'
export const BADGE_KIND_ERROR = 'error'
export const BADGE_KIND_SUCCESS = 'success'
export type BadgeKind =
  | typeof BADGE_KIND_DEFAULT
  | typeof BADGE_KIND_DEFAULT_OUTLINE
  | typeof BADGE_KIND_INFO
  | typeof BADGE_KIND_WARNING
  | typeof BADGE_KIND_ALTERNATIVE_INFO
  | typeof BADGE_KIND_ERROR
  | typeof BADGE_KIND_SUCCESS
