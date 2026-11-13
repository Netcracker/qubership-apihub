import { FONT_FAMILY_INTER } from '@apihub/constants/fonts'
import { cn } from '@apihub/utils/common/cn'
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
    <div className={cn(classes)}>
      <pre style={{ fontFamily: FONT_FAMILY_INTER }}>
        {text}
      </pre>
    </div>
  )
})
