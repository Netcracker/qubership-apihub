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
import { memo, useMemo } from 'react'
import { ColorSchema } from '../../../../types/aliases/common'
import { getUxBadgeColorSchema } from './consts'
import { BADGE_KIND_DEFAULT, BadgeKind } from './types'
import './UxBadge.css'

export type BadgeProps = {
  kind?: BadgeKind
  text: string | ReactNode
  colorSchema?: ColorSchema
  inline?: boolean
}

export const UxBadge: FC<BadgeProps> = memo<BadgeProps>(props => {
  const { text, kind = BADGE_KIND_DEFAULT, colorSchema, inline } = props

  const classes = useMemo(() => ([
    'ux-badge',
    inline ? 'inline-flex' : '',
    colorSchema || getUxBadgeColorSchema(kind),
  ]).join(' '), [inline, colorSchema, kind])

  return (
    <div className={classes}>
      <pre style={{ fontFamily: 'Inter' }}>
        {text}
      </pre>
    </div>
  )
})
