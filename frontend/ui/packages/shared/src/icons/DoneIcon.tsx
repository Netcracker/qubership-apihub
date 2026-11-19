import type { FC } from 'react'
import { memo } from 'react'

type DoneIconProps = {
  color?: string
}

export const DoneIcon: FC<DoneIconProps> = memo(({ color }) => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" data-testid="DoneIcon">
        <path
          d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
          fill={color ?? 'black'}
        />
      </svg>
    </div>
  )
})
