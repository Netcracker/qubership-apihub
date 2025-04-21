import type { Meta, StoryObj } from '@storybook/react'
import { InfoContextIcon } from '../icons/InfoContextIcon'
import { createVariantStory } from './commons/utils'

const meta = {
  title: 'Icons/InfoContextIcon',
  component: InfoContextIcon,
} satisfies Meta<typeof InfoContextIcon>

export default meta
type Story = StoryObj<typeof meta>

const sizes = ['extra-small', 'small', 'medium', 'large'] as const
const colors = ['primary', 'secondary', 'action', 'disabled', 'error', 'info', 'success', 'warning', 'muted'] as const

export const Sizes: Story = createVariantStory(InfoContextIcon, 'fontSize', sizes)

export const Colors: Story = createVariantStory(InfoContextIcon, 'color', colors)

export const Playground: Story = {
  args: {
    fontSize: 'small',
    color: 'muted',
  },
  argTypes: {
    fontSize: {
      control: 'radio',
      options: sizes,
      description: 'Size of the icon, including custom extra-small size',
      table: {
        defaultValue: { summary: 'small' },
      },
    },
    color: {
      control: 'radio',
      options: colors,
      description: 'Color of the icon, including custom muted color',
      table: {
        defaultValue: { summary: 'muted' },
      },
    },
    testId: {
      table: {
        disable: true,
      },
    },
  },
}
