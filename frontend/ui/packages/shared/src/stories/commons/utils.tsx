import type { StoryObj } from '@storybook/react'
import { Box, List, ListItem, Stack, Typography } from '@mui/material'
import React from 'react'

/**
 * Creates a story for displaying variants of a component prop
 * @example
 * export const Sizes = createVariantStory(Button, 'size', ['small', 'medium', 'large'])
 */
export const createVariantStory = (
  Component: React.ComponentType,
  propName: string,
  propValues: readonly (string | undefined)[],
): StoryObj => {
  return {
    render: () => (
      <List>
        {propValues.map((value) => {
          if (value === undefined) {
            return null
          }

          return (
            <ListItem key={value}>
              <Stack direction="row" spacing={2} alignItems="center" width="100%">
                <Box display="flex" justifyContent="center" minWidth={40}>
                  <Component {...{ [propName]: value }} />
                </Box>
                <Typography align="left">{value}</Typography>
              </Stack>
            </ListItem>
          )
        })}
      </List>
    ),
  }
}
