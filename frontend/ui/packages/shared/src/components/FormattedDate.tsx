import type { FC } from 'react'
import { memo } from 'react'
import Tooltip from '@mui/material/Tooltip'
import { toDateFormat, toTimezone } from '../utils/date'
import { Typography } from '@mui/material'

export type FormattedDateProps = {
  value: string | undefined
  format?: string
  color?: string
}

export const FormattedDate: FC<FormattedDateProps> = memo<FormattedDateProps>(({ value, format, color }) => {

  if (!value) {
    return null
  }

  const date = toTimezone(value)
  const formattedDate = toDateFormat(date, format)

  return (
    <Tooltip title={`${(date.toTimeString())}`}>
      <Typography
        component="span"
        variant="body2"
        sx={{ color: color ? color : 'inherit' }}
      >
        {formattedDate}
      </Typography>
    </Tooltip>
  )
})
