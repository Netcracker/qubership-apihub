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

import { Box } from '@mui/material'
import type { FC, ReactNode } from 'react'
import { memo } from 'react'

export type SidebarPanelProps = {
  header?: ReactNode
  body?: ReactNode
}

export const SidebarPanel: FC<SidebarPanelProps> = memo<SidebarPanelProps>(({ header, body }) => {
  return (
    <Box display="flex" height="100%" width="100%" flexDirection="column" overflow="hidden">
      <Box
        display="flex"
        gap={2}
        marginX={2}
        paddingY={2}
        alignItems="center"
        justifyContent="space-between"
        width="100%"
      >
        {header}
      </Box>
      {body}
    </Box>
  )
})
