import ErrorIcon from '@mui/icons-material/Error'
import {
  NOTIFICATION_SEVERITY,
  type NotificationSeverity,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-notifications'
import { type FC, memo } from 'react'

const COLOR_BY_SEVERITY: Record<NotificationSeverity, string> = {
  [NOTIFICATION_SEVERITY.ERROR]: 'error.main',
  [NOTIFICATION_SEVERITY.WARNING]: 'warning.main',
  [NOTIFICATION_SEVERITY.INFORMATION]: 'information.main',
  [NOTIFICATION_SEVERITY.HINT]: 'hint.main',
}

const TEST_ID_BY_SEVERITY: Record<NotificationSeverity, string> = {
  [NOTIFICATION_SEVERITY.ERROR]: 'ErrorIcon',
  [NOTIFICATION_SEVERITY.WARNING]: 'WarningIcon',
  [NOTIFICATION_SEVERITY.INFORMATION]: 'InformationIcon',
  [NOTIFICATION_SEVERITY.HINT]: 'HintIcon',
}

export type NotificationSeverityMarkerProps = {
  severity: NotificationSeverity
}

export const NotificationSeverityMarker: FC<NotificationSeverityMarkerProps> = memo<NotificationSeverityMarkerProps>(({
  severity,
}) => {
  return (
    <ErrorIcon
      data-testid={TEST_ID_BY_SEVERITY[severity]}
      titleAccess={severity}
      sx={{
        color: COLOR_BY_SEVERITY[severity],
        width: '16px',
        height: '16px',
        display: 'block',
      }}
    />
  )
})

NotificationSeverityMarker.displayName = 'NotificationSeverityMarker'
