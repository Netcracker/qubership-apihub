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

import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import { COLOR_SCHEMAS, COMMON_LAYOUT_STYLE, COMMON_LAYOUT_STYLE_WITHOUT_BORDER } from './consts'
import { BADGE_KIND_ALTERNATIVE_INFO, BADGE_KIND_DEFAULT, BADGE_KIND_INFO, BadgeKind } from './types'
import { ColorSchema } from '../../../types/aliases/common'

export type BadgeProps = {
  kind?: BadgeKind
  text: string | ReactNode
  colorSchema?: ColorSchema
  inline?: boolean
}

export const UxBadge: FC<BadgeProps> = memo<BadgeProps>(props => {
  const { text, kind = BADGE_KIND_DEFAULT, colorSchema, inline } = props
  let mainStyle = [ BADGE_KIND_DEFAULT, BADGE_KIND_INFO, BADGE_KIND_ALTERNATIVE_INFO ].includes(kind)
    ? COMMON_LAYOUT_STYLE_WITHOUT_BORDER
    : COMMON_LAYOUT_STYLE
  if (inline) {
    mainStyle = `inline-flex ${mainStyle}`
  }
  return (
    <div className={`${mainStyle} ${colorSchema || COLOR_SCHEMAS[kind]}`}>
      <pre style={{ fontFamily: 'Inter' }}>
        {text}
      </pre>
    </div>
  )
})
