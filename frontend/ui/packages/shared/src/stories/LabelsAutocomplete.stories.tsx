import type { Meta, StoryObj } from '@storybook/react-vite'
import { LabelsAutocomplete } from '../components/LabelsAutocomplete'

const meta: Meta<typeof LabelsAutocomplete> = {
  title: 'Autocompletes/Labels Autocomplete',
  component: LabelsAutocomplete,
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default Labels Autocomplete',
  args: {
    value: ['label1', 'label2', 'label3'],
    onChange: (event, value) => console.log('onChange', value),
  },
}
