import type { Meta, StoryObj } from '@storybook/react'
import { appHeaderBackground } from '../../../stories/commons/decorators'
import { VsCodeExtensionButton } from './VsCodeExtensionButton'

const meta: Meta<typeof VsCodeExtensionButton> = {
  title: 'Buttons/VS Code Extension Button',
  component: VsCodeExtensionButton,
  parameters: {
    layout: 'centered',
  },
  decorators: [appHeaderBackground],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'VS Code Extension Button',
}
