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
import { Box, Divider, Typography } from '@mui/material'
import { NamespaceSelector } from './NamespaceSelector'
import { WorkspaceSelector } from './WorkspaceSelector'
import { AgentsSelector } from './AgentsSelector'
import { CloudIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CloudIcon'

export const NamespaceToolbar: FC = memo(() => {
  return (
    <Box
      gap={2}
      display="flex"
      overflow="hidden"
      alignItems="center"
      minWidth="max-content"
      data-testid="NamespaceToolbar"
    >
      <CloudIcon/>

      <Typography variant="subtitle2">From</Typography>

      <AgentsSelector/>

      <NamespaceSelector/>

      <Divider orientation="vertical"/>

      <Typography variant="subtitle2">To</Typography>

      <WorkspaceSelector/>
    </Box>
  )
})
