import type { SvgIconProps } from '@mui/material'
import { CircularProgress, Tooltip } from '@mui/material'
import { type FC, memo } from 'react'

import {
  SHAREABILITY_STATUS_NON_SHAREABLE,
  SHAREABILITY_STATUS_SHAREABLE,
  SHAREABILITY_STATUS_UNKNOWN,
  type ShareabilityStatus,
} from '@netcracker/qubership-apihub-api-processor'
import {
  ShareabilityNonShareableIcon,
  ShareabilityShareableIcon,
  ShareabilityUnknownIcon,
} from '@netcracker/qubership-apihub-ui-shared/icons/ShareabilityIcons'

const ICON_BY_STATUS: Record<ShareabilityStatus, FC<SvgIconProps>> = {
  [SHAREABILITY_STATUS_SHAREABLE]: ShareabilityShareableIcon,
  [SHAREABILITY_STATUS_NON_SHAREABLE]: ShareabilityNonShareableIcon,
  [SHAREABILITY_STATUS_UNKNOWN]: ShareabilityUnknownIcon,
}

const COLOR_BY_STATUS: Record<ShareabilityStatus, SvgIconProps['color']> = {
  [SHAREABILITY_STATUS_SHAREABLE]: 'secondary',
  [SHAREABILITY_STATUS_NON_SHAREABLE]: 'error',
  [SHAREABILITY_STATUS_UNKNOWN]: 'action',
}

const TOOLTIP_TEXT_BY_STATUS: Record<ShareabilityStatus, string> = {
  [SHAREABILITY_STATUS_NON_SHAREABLE]: 'Non-Shareable',
  [SHAREABILITY_STATUS_SHAREABLE]: 'Shareable',
  [SHAREABILITY_STATUS_UNKNOWN]: 'Unknown shareability',
}

type ShareabilityMarkerProps = {
  value: ShareabilityStatus
  className?: string
  isLoading?: boolean
}

export const ShareabilityMarker: FC<ShareabilityMarkerProps> = memo(({ value, className, isLoading = false }) => {
  const Icon = ICON_BY_STATUS[value]

  if (isLoading) {
    return <CircularProgress sx={{ ml: 0.5 }} size={16} />
  }

  return (
    <Tooltip title={TOOLTIP_TEXT_BY_STATUS[value]}>
      <Icon fontSize="small" color={COLOR_BY_STATUS[value]} className={className} />
    </Tooltip>
  )
})
