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
import { Box, Grid, Typography } from '@mui/material'
import { TitledValue } from './TitledValue'

export type GroupDetails = Partial<{
  name: string
  parentGroup: string
  alias: string
  description: string
}>

export const GroupDetails: FC<GroupDetails> = memo<GroupDetails>(({
  name,
  parentGroup,
  alias,
  description,
}) => {
  return (
    <Box marginTop={2} height="100%" overflow="hidden">
      <Grid item xs container spacing={2} height="100%" overflow="auto">
        <Grid item xs={12}>
          <TitledValue
            title="Group name"
            value={name}
          />
        </Grid>
        <Grid item xs={12}>
          <TitledValue
            title="Alias"
            value={alias}
          />
        </Grid>
        <Grid item xs={12}>
          <TitledValue
            title="Parent group"
            value={parentGroup}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2">Description</Typography>
          <Typography variant="body2">{description}</Typography>
        </Grid>
      </Grid>
    </Box>
  )
})
