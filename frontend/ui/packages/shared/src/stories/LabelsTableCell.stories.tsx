import type { Meta, StoryObj } from '@storybook/react-vite'
import { LabelsTableCell } from '../components/LabelsTableCell'

const meta: Meta<typeof LabelsTableCell> = {
  title: 'Labels Table Cell',
  component: LabelsTableCell,
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default Labels Table Cell',
  args: {
    labels: ['label1', 'loooooooooooooong-label-2', 'label-3'],
  },
}
