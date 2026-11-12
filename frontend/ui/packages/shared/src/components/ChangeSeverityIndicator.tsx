import type { FC } from 'react'
import { memo } from 'react'
import { Box } from '@mui/material'
import type { SxProps } from '@mui/system'
import type { ChangeSeverity } from '../entities/change-severities'
import { CHANGE_SEVERITY_COLOR_MAP, CHANGE_SEVERITY_NAME_MAP } from '../entities/change-severities'

export type ChangeSeverityIndicatorProps = {
  severity: ChangeSeverity
  sx?: SxProps
}

export const ChangeSeverityIndicator: FC<ChangeSeverityIndicatorProps> = memo<ChangeSeverityIndicatorProps>(({
  severity,
  sx,
}) => {

  return CHANGE_SEVERITY_NAME_MAP[severity] ? <Box
    sx={{
      position: 'absolute',
      backgroundColor: CHANGE_SEVERITY_COLOR_MAP[severity],
      height: '100%',
      width: '5px',
      fontSize: 13,
      color: 'transparent',
      overflow: 'hidden',
      transition: 'all 0.3s ease-in-out',
      '&:hover': {
        color: '#FFFFFF',
        padding: '5px',
        width: 'auto',
      },
      ...sx,
    }}
    data-testid="ChangeSeverityIndicator">
    {CHANGE_SEVERITY_NAME_MAP[severity]?.toLocaleLowerCase()}
  </Box> : null
})
