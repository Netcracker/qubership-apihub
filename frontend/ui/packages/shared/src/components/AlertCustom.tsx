import { Alert, AlertTitle, type PaletteColor, styled, type Theme } from '@mui/material'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import { type FC, memo } from 'react'

import { CheckCircleIcon } from '../icons/CheckCircleIcon'
import { ErrorIcon } from '../icons/ErrorIcon'
import { InfoFilledIcon } from '../icons/InfoFilledIcon'
import { WarningIconMui } from '../icons/WarningIconMui'
import { ALERT_SEVERITY, type AlertSeverity } from '../themes/alert'

export type AlertCustomProps = {
  severity: AlertSeverity
  title?: string
  message: string
  className?: string
}

type AlertCustomConfig = {
  icon: FC<SvgIconProps>
  color: (theme: Theme) => PaletteColor
}

const alertConfig: Record<AlertSeverity, AlertCustomConfig> = {
  [ALERT_SEVERITY.SUCCESS]: {
    icon: CheckCircleIcon,
    color: (theme) => theme.palette.secondary,
  },
  [ALERT_SEVERITY.WARNING]: {
    icon: WarningIconMui,
    color: (theme) => theme.palette.warning,
  },
  [ALERT_SEVERITY.ERROR]: {
    icon: ErrorIcon,
    color: (theme) => theme.palette.error,
  },
  [ALERT_SEVERITY.INFO]: {
    icon: InfoFilledIcon,
    color: (theme) => theme.palette.primary,
  },
}

const AlertCustomBase = styled(Alert)<{ severity: AlertSeverity }>(({ theme, severity }) => {
  const color = alertConfig[severity].color(theme)

  return {
    borderRadius: theme.spacing(0.75),
    backgroundColor: color.light,
    '& .MuiAlert-icon': {
      color: color.main,
      marginRight: theme.spacing(0.75),
    },
    '& .MuiSvgIcon-root': {
      fontSize: theme.typography.pxToRem(20),
    },
    '& .MuiAlertTitle-root': {
      ...theme.typography.subtitle1,
    },
    '& .MuiAlert-message': {
      ...theme.typography.body2,
    },
    '& .MuiAlert-action': {
      marginTop: theme.spacing(0),
    },
  }
})

export const AlertCustom: FC<AlertCustomProps> = memo(({
  severity,
  title,
  message,
  className,
}) => {
  const { icon: Icon } = alertConfig[severity]

  return (
    <AlertCustomBase
      severity={severity}
      data-testid={`Alert-${severity}`}
      className={className}
      icon={<Icon />}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {message}
    </AlertCustomBase>
  )
})
