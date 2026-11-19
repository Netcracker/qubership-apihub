import type { Meta, StoryObj } from '@storybook/react-vite'
import { Box } from '@mui/material'
import React from 'react'
import { CustomTagsTree } from '../components/CustomTagsTree'
import { tree } from './samples/tree-samples'

const meta: Meta<typeof CustomTagsTree> = {
  title: 'Custom Tags Tree',
  component: CustomTagsTree,
  decorators: [
    (Story) => (
      <Box
        sx={{
          'ul': {
            'list-style-type': 'none',
            'padding-inline-start': 0,
          },
        }}
      >
        <Story/>
      </Box>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    tree: tree,
  },
}
