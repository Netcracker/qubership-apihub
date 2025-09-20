import type { Meta, StoryObj } from '@storybook/react'
import type { ReactElement } from 'react'
import React from 'react'
import type { ConfirmationDialogProps } from './ConfirmationDialog'
import { ConfirmationDialog } from './ConfirmationDialog'

const meta = {
  title: 'Dialogs/Confirmation Dialog',
  component: ConfirmationDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A confirmation dialog component for critical actions that require user confirmation.',
      },
    },
  },
  args: {
    open: true,
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Controls whether the dialog is open',
      table: { disable: true },
    },
    title: {
      control: 'text',
      description: 'Title text displayed in the dialog header',
    },
    message: {
      control: 'text',
      description: 'Message text displayed in the dialog content',
    },
    loading: {
      control: 'boolean',
      description: 'Shows loading state on the confirm button',
    },
    confirmButtonName: {
      control: 'text',
      description: 'Text displayed on the confirm button',
    },
    confirmButtonColor: {
      control: 'select',
      options: ['inherit', 'primary', 'secondary', 'success', 'error', 'info', 'warning'],
      description: 'Color variant of the confirm button',
    },
    onConfirm: {
      action: 'confirmed',
      description: 'Callback fired when confirm button is clicked',
    },
    onCancel: {
      action: 'cancelled',
      description: 'Callback fired when cancel button is clicked or dialog is closed',
    },
  },
} satisfies Meta<typeof ConfirmationDialog>

export default meta
type Story = StoryObj<typeof meta>

const RenderDialog = (args: ConfirmationDialogProps): ReactElement => {
  const handleConfirm = (): void => {
    args.onConfirm?.()
  }

  const handleCancel = (): void => {
    args.onCancel?.()
  }

  return (
    <ConfirmationDialog
      {...args}
      open={args.open}
      loading={args.loading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )
}

export const Default: Story = {
  args: {
    title: 'Confirm Action',
    message: 'Are you sure you want to perform this action? This cannot be undone.',
    confirmButtonName: 'Confirm',
    confirmButtonColor: 'primary',
    loading: false,
  },
  render: RenderDialog,
}

export const DeleteConfirmation: Story = {
  args: {
    title: 'Delete Item',
    message: 'Are you sure you want to delete this item? This action cannot be undone.',
    confirmButtonName: 'Delete',
    confirmButtonColor: 'error',
  },
  render: RenderDialog,
}

export const WithoutMessage: Story = {
  args: {
    title: 'Simple Confirmation',
    confirmButtonName: 'Delete',
    confirmButtonColor: 'error',
  },
  render: RenderDialog,
}

export const WithoutTitle: Story = {
  args: {
    message: 'Are you sure you want to perform this action? This cannot be undone.',
    confirmButtonName: 'Confirm',
    confirmButtonColor: 'primary',
  },
  render: RenderDialog,
}

export const LongMessage: Story = {
  args: {
    title: 'Important Notice',
    message:
      'This is a very long message that demonstrates how the dialog handles longer text content. The dialog should properly wrap the text and maintain good readability while keeping the overall layout clean and user-friendly.',
    confirmButtonName: 'I Understand',
    confirmButtonColor: 'primary',
  },
  render: RenderDialog,
}
