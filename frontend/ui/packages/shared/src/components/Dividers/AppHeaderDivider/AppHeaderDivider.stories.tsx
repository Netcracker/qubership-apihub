import type { Meta, StoryObj } from '@storybook/react'
import { AppHeaderDivider } from './AppHeaderDivider'
import { appHeaderBackground } from '../../../stories/commons/decorators'

const meta: Meta<typeof AppHeaderDivider> = {
  title: 'Dividers/App Header Divider',
  component: AppHeaderDivider,
  parameters: {
    layout: 'centered',
  },
  decorators: [appHeaderBackground],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'App Header Divider',
  render: () => (
    <>
      <span>Left Content</span>
      <AppHeaderDivider />
      <span>Right Content</span>
    </>
  ),
}
