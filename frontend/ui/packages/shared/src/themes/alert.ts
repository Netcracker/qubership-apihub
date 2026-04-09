import type { AlertColor } from '@mui/material'

export const ALERT_SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  SUCCESS: 'success',
  INFO: 'info',
} as const satisfies Record<string, AlertColor>

export type AlertSeverity = (typeof ALERT_SEVERITY)[keyof typeof ALERT_SEVERITY]
