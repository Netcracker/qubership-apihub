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
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import type { TestableProps } from './Testable'

export type ToolbarProps = {
  breadcrumbs?: ReactNode
  header?: ReactNode
  action?: ReactNode
  size?: ToolbarSize
} & TestableProps

export const Toolbar: FC<ToolbarProps> = memo<ToolbarProps>(({
  breadcrumbs,
  header,
  action,
  size = SMALL_TOOLBAR_SIZE,
  testId,
}) => {
  return (
    <Card>
      <CardHeader
        sx={{ height: TOOLBAR_HEIGHT[breadcrumbs ? LARGE_TOOLBAR_SIZE : size], px: 4 }}
        title={breadcrumbs}
        subheader={
          <Box
            display="flex"
            maxWidth="55vw"
            gap={1}
            alignItems="baseline"
            height={28}
          >
            {header}
          </Box>
        }
        subheaderTypographyProps={{ variant: 'h5', color: '#000000' }}
        action={
          <Box display="flex" gap={1}>
            {action}
          </Box>
        }
        data-testid={testId}
      />
    </Card>
  )
})

export const SMALL_TOOLBAR_SIZE = 'small'
export const MEDIUM_TOOLBAR_SIZE = 'medium'
export const LARGE_TOOLBAR_SIZE = 'large'
type ToolbarSize =
  | typeof SMALL_TOOLBAR_SIZE
  | typeof MEDIUM_TOOLBAR_SIZE
  | typeof LARGE_TOOLBAR_SIZE

const TOOLBAR_HEIGHT: Record<ToolbarSize, string> = {
  [SMALL_TOOLBAR_SIZE]: '36px',
  [MEDIUM_TOOLBAR_SIZE]: '64px',
  [LARGE_TOOLBAR_SIZE]: '72px',
}
