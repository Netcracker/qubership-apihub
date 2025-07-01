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
  annotation,
  breaking,
  deprecated,
  DiffType,
  nonBreaking, risky,
  unclassified,
} from '@netcracker/qubership-apihub-api-diff'
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

export const COLOR_SCHEMAS: Record<BadgeKind, string> = {
  [BADGE_KIND_DEFAULT]: 'bg-gray-100 text-slate-500',
  [BADGE_KIND_DEFAULT_OUTLINE]: 'ring-1 ring-slate-500 text-slate-500',
  [BADGE_KIND_INFO]: 'bg-sky-100 text-blue-700',
  [BADGE_KIND_WARNING]: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
  [BADGE_KIND_ALTERNATIVE_INFO]: 'bg-yellow-100 text-amber-700',
  [BADGE_KIND_ERROR]: 'bg-red-50 text-red-700 ring-red-600/10',
  [BADGE_KIND_SUCCESS]: 'bg-green-50 text-green-700 ring-green-600/20',
}

export const DIFF_TYPE_COLORS: Record<DiffType, string> = {
  [breaking]: '#ED4A54',
  [risky]: '#E98554',
  [deprecated]: '#FFB02E',
  [nonBreaking]: '#84CB7A',
  [annotation]: '#B866C9',
  [unclassified]: '#70A9EC',
}

export const DIFF_TYPE_NAME_MAP: Record<DiffType, string> = {
  [breaking]: 'breaking',
  [risky]: 'requires attention',
  [deprecated]: 'deprecated',
  [nonBreaking]: 'non-breaking',
  [unclassified]: 'unclassified',
  [annotation]: 'annotation',
}

export const COMMON_LAYOUT_STYLE_WITHOUT_BORDER = 'rounded-md px-2 pb-px text-xs font-normal'

export const COMMON_LAYOUT_STYLE = `${COMMON_LAYOUT_STYLE_WITHOUT_BORDER} ring-1 ring-inset`