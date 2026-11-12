import type { Meta, StoryObj } from '@storybook/react-vite'
import { CustomMetadataCell } from '../components/CustomMetadataCell'
import { metadata } from './samples/metadata-samples'

const meta: Meta<typeof CustomMetadataCell> = {
  title: 'Custom Metadata Cell',
  component: CustomMetadataCell,
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    metaData: metadata,
    textFilter: '',
  },
}

export const WithTextFilterStory: Story = {
  name: 'With Text Filter',
  args: {
    metaData: metadata,
    textFilter: 'x-custom8: test',
  },
}
