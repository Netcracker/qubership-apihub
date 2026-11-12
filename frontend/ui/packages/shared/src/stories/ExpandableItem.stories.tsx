import type { Meta, StoryObj } from '@storybook/react-vite'
import { Box } from '@mui/material'
import { RED_SECTION_COLOR } from './commons/placeholder-colors'
import { ExpandableItem } from '../components/ExpandableItem'

const meta: Meta<typeof ExpandableItem> = {
  title: 'Expandable Item',
  component: ExpandableItem,
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    children: <Box sx={{ backgroundColor: RED_SECTION_COLOR }}>An Expandable Item Component</Box>,
    showToggler: true,
    expanded: false,
  },
}
