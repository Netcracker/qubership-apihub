import type { FC } from 'react'
import * as React from 'react'
import { memo } from 'react'

export type WarningCircleIconProps = {
  color: string
}

const WarningCircleIcon: FC<WarningCircleIconProps> = memo(({ color }) => {
  return (
    <div style={{ display: 'flex' }}>
      <svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="3" cy="3" r="3" fill={color}/>
      </svg>
    </div>
  )
})

export const YellowWarningCircleIcon: FC = memo(() => {
  return (
    <WarningCircleIcon color="#FFB02E"/>
  )
})

export const RedWarningCircleIcon: FC = memo(() => {
  return (
    <WarningCircleIcon color="#FF5260"/>
  )
})
