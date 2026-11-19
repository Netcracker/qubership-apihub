import type { FC } from 'react'
import { memo } from 'react'
import Box from '@mui/material/Box'
import WarningRoundedIcon from '@mui/icons-material/WarningRounded'

type NotificationProps = {
  value: string
}

export const NOTIFICATION_HEIGHT = 40

export const MaintenanceNotification: FC<NotificationProps> = memo<NotificationProps>(({ value }) => {
  return (
    <Box height={NOTIFICATION_HEIGHT} sx={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: '#FFF4CC',
      width: '100%',
    }}>
      <WarningRoundedIcon fontSize="small" color="warning"/>
      <Box sx={{ ml: '10px' }}>{value}</Box>
    </Box>
  )
})
