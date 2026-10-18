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

import { Box, Divider } from '@mui/material'
import type { FC, ReactNode } from 'react'
import * as React from 'react'
import { memo, useMemo } from 'react'

export type SidebarPanelProps = {
  header?: ReactNode
  body?: ReactNode
  withDivider?: boolean
  headerFullWidth?: boolean
}

// First Order Component //
export const SidebarPanel: FC<SidebarPanelProps> = memo<SidebarPanelProps>(({
  header,
  body,
  withDivider,
  headerFullWidth,
}) => {
  const headerStyles = useMemo(
    () => (!headerFullWidth ? { display: 'flex', gap: 2, marginX: 2, marginY: 2 } : {}),
    [headerFullWidth],
  )

  return (
    <Box display="flex" height="100%" width="100%" flexDirection="column" overflow="hidden" data-testid="SidebarPanel">
      {header && (
        <>
          <Box
            alignItems="center"
            justifyContent="space-between"
            width="100%"
            sx={headerStyles}
          >
            {header}
          </Box>
          {withDivider && <Divider orientation="horizontal" variant="fullWidth"/>}
        </>
      )}
      {body}
    </Box>
  )
})
