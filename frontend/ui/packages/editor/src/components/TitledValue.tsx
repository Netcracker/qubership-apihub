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

import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import { Box, Typography } from '@mui/material'
import type { SxProps } from '@mui/system'
import type { Theme } from '@mui/material/styles'

export type TitledValueProps = { sx?: SxProps<Theme> } & {
  title: string
  value?: ReactNode
}

export const TitledValue: FC<TitledValueProps> = memo<TitledValueProps>(({ title, value, sx }) => {
  return <Box sx={sx}>
    <Typography noWrap variant="subtitle2">{title}</Typography>
    <Typography noWrap variant="body2">{value}</Typography>
  </Box>
})
