import type { Meta, StoryObj } from '@storybook/react'
import type { ReactElement } from 'react'
import { AlertCustom, type AlertCustomProps } from './AlertCustom'

type StoryProps = AlertCustomProps & {
  showTitle: boolean
}

const meta: Meta<StoryProps> = {
  title: 'Feedback/AlertCustom',
  component: AlertCustom,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    severity: {
      control: { type: 'inline-radio' },
      options: ['success', 'warning', 'error', 'info'],
    },
    showTitle: {
      control: { type: 'boolean' },
      description: 'Show alert title',
    },
    className: {
      table: { disable: true },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const RenderAlertCustom = (args: StoryProps): ReactElement => {
  const {
    showTitle,
    title,
    message,
    severity,
  } = args

  return (
    <AlertCustom
      severity={severity}
      title={showTitle ? title : undefined}
      message={message}
    />
  )
}

export const Default: Story = {
  args: {
    severity: 'success',
    showTitle: true,
    title: 'Example title',
    message: 'Example message for alert content.',
  },
  render: RenderAlertCustom,
}
