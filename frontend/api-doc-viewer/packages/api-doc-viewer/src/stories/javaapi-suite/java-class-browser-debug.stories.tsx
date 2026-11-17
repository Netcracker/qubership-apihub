import type { Meta, StoryObj } from '@storybook/react-vite'
import { JavaClassBrowserDebug } from './JavaClassBrowserDebug'

const meta = {
  title: 'Debug/Java API Class Browser',
  component: JavaClassBrowserDebug,
  argTypes: {
    sample: {
      control: 'select',
      options: ['report', 'diff'],
    },
  },
  args: {
    sample: 'report',
  },
} satisfies Meta<typeof JavaClassBrowserDebug>

export default meta

type Story = StoryObj<typeof JavaClassBrowserDebug>

export const Debug: Story = {}
