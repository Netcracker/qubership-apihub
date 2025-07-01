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

import { Box, ThemeProvider } from '@mui/material'
import type { StoryContext } from '@storybook/react'
import type { FC } from 'react'
import React from 'react'
import { theme } from '../../themes/theme'

export function fullHeight(
  Story: FC<StoryContext>,
  storyContext: StoryContext,
): JSX.Element {
  return (
    <div style={{ height: '100vh' }}>
      <Story {...storyContext} />
    </div>
  )
}

export function appHeaderBackground(
  Story: FC<StoryContext>,
  storyContext: StoryContext,
): JSX.Element {
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          backgroundColor: theme.palette.primary.main,
          color: 'white',
          padding: 2,
          height: '44px',
        }}
      >
        <Story {...storyContext} />
      </Box>
    </ThemeProvider>
  )
}
