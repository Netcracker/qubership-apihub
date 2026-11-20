import { cn } from '@apihub/utils/common/cn'
import type { FC } from 'react'
import './UxDiffFloatingBadge.css'
import { DIFF_TYPE_COLORS, DIFF_TYPE_NAME_MAP } from '../UxMarker/consts'
import { DiffType } from '@netcracker/qubership-apihub-api-diff'

export type UxDiffFloatingBadgeProps = {
  variant: DiffType,
  message: string | undefined,
  backgroundColor?: string
}

export const UxDiffFloatingBadge: FC<UxDiffFloatingBadgeProps> = (props) => {
  const { variant, message } = props

  return (
    <div
      className={cn("UxDiffFloatingBadge absolute z-10 text-white text-xs w-1 h-full hover:w-max hover:cursor-default hover:px-2")}
      style={{
        backgroundColor: DIFF_TYPE_COLORS[variant]
      }}
    >
      <span className={cn("UxDiffFloatingBadge-content")}>{DIFF_TYPE_NAME_MAP[variant]}{message ? `, ${message}` : ''}</span>
    </div>
  )
}
