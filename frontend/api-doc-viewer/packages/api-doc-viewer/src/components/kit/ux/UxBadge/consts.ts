import {
  BADGE_KIND_ALTERNATIVE_INFO,
  BADGE_KIND_DEFAULT,
  BADGE_KIND_DEFAULT_OUTLINE,
  BADGE_KIND_ERROR,
  BADGE_KIND_INFO,
  BADGE_KIND_SUCCESS,
  BADGE_KIND_WARNING,
  BadgeKind,
} from './types'

export function getUxBadgeColorSchema(kind: BadgeKind): string {
  return `ux-badge_${kind}`
}

export const COLOR_SCHEMAS: Record<BadgeKind, string> = {
  [BADGE_KIND_DEFAULT]: getUxBadgeColorSchema(BADGE_KIND_DEFAULT),
  [BADGE_KIND_DEFAULT_OUTLINE]: getUxBadgeColorSchema(BADGE_KIND_DEFAULT_OUTLINE),
  [BADGE_KIND_INFO]: getUxBadgeColorSchema(BADGE_KIND_INFO),
  [BADGE_KIND_WARNING]: getUxBadgeColorSchema(BADGE_KIND_WARNING),
  [BADGE_KIND_ALTERNATIVE_INFO]: getUxBadgeColorSchema(BADGE_KIND_ALTERNATIVE_INFO),
  [BADGE_KIND_ERROR]: getUxBadgeColorSchema(BADGE_KIND_ERROR),
  [BADGE_KIND_SUCCESS]: getUxBadgeColorSchema(BADGE_KIND_SUCCESS),
}
