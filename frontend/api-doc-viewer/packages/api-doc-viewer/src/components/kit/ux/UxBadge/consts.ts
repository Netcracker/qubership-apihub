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
