import type { Meta, StoryObj } from '@storybook/react-vite'
import { CustomChip } from '../components/CustomChip'

const meta: Meta<typeof CustomChip> = {
  title: 'Custom Chip',
  component: CustomChip,
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    value: 'default',
    label: 'Some text',
    isExtraSmall: false,
  },
}

export const OutlinedChip: Story = {
  args: {
    value: 'Some text',
    isExtraSmall: false,
    variant: 'outlined',
    onDelete: undefined,
  },
}

export const ExtraSmallChip: Story = {
  args: {
    value: 'Extra small chip',
    isExtraSmall: true,
    onDelete: undefined,
  },
}


