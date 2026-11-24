import type { FC } from 'react'
import { memo } from 'react'

export const CheckboxIcon: FC = memo(() => {
    return (
      <div style={{ display: 'flex' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g opacity="0.5">
            <rect x="0.5" y="0.500977" width="15" height="15" rx="3.5" fill="white"/>
            <rect x="0.5" y="0.500977" width="15" height="15" rx="3.5" stroke="#B4BFCF"/>
          </g>
        </svg>
      </div>
    )
  },
)
