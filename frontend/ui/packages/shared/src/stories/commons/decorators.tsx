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
