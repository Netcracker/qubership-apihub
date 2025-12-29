import ErrorIcon from '@mui/icons-material/Error'
import type { FC } from 'react'
import { IssueSeverities, type IssueSeverity } from '@apihub/entities/api-quality/issue-severities'

const Size = {
  SMALL: 'small',
  MEDIUM: 'medium',
} as const
type Size = typeof Size[keyof typeof Size]

type IssueSeverityMarkerProps = {
  severity: IssueSeverity
  size?: Size
}

const COLOR_BY_SEVERITY: Record<IssueSeverity, string> = {
  [IssueSeverities.ERROR]: '#FF5260',
  [IssueSeverities.WARNING]: '#FFB02E',
  [IssueSeverities.INFO]: '#0068FF',
  [IssueSeverities.HINT]: '#B4BFCF',
}

const TEST_ID_BY_SEVERITY: Record<IssueSeverity, string> = {
  [IssueSeverities.ERROR]: 'ErrorIcon',
  [IssueSeverities.WARNING]: 'WarningIcon',
  [IssueSeverities.INFO]: 'InfoIcon',
  [IssueSeverities.HINT]: 'HintIcon',
}

export const IssueSeverityMarker: FC<IssueSeverityMarkerProps> = ({ severity, size = Size.MEDIUM }) => {
  let sizePx: string
  switch (size) {
    case Size.SMALL:
      sizePx = '12px'
      break
    default:
    case Size.MEDIUM:
      sizePx = '16px'
      break
  }
  return (
    <ErrorIcon
      data-testid={TEST_ID_BY_SEVERITY[severity]}
      sx={{
        color: COLOR_BY_SEVERITY[severity],
        width: sizePx,
        height: sizePx,
      }}
    />
  )
}
