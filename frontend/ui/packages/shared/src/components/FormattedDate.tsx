/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
