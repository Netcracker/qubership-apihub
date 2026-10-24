import ErrorIcon from '@mui/icons-material/Error'
import type { SvgIconProps } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { FC } from 'react'

import {
  ISSUE_SEVERITY_COLOR_MAP,
  IssueSeverities,
  type IssueSeverity,
} from '@portal/entities/api-quality/issue-severities'

type SeverityMarkerProps = Pick<SvgIconProps, 'titleAccess' | 'className'> & {
  severity: IssueSeverity
}

const TEST_ID_BY_SEVERITY: Record<IssueSeverity, string> = {
  [IssueSeverities.ERROR]: 'ErrorIcon',
  [IssueSeverities.WARNING]: 'WarningIcon',
  [IssueSeverities.INFO]: 'InfoIcon',
  [IssueSeverities.HINT]: 'HintIcon',
}

export const SeverityMarker: FC<SeverityMarkerProps> = ({ severity, titleAccess, className }) => (
  <MarkerIcon
    className={className}
    titleAccess={titleAccess}
    sx={{ color: ISSUE_SEVERITY_COLOR_MAP[severity] }}
    data-testid={TEST_ID_BY_SEVERITY[severity]}
  />
)

SeverityMarker.displayName = 'SeverityMarker'

const MarkerIcon = styled(ErrorIcon)({
  width: 16,
  height: 16,
})
