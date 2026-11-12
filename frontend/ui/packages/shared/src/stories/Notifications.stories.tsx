import type { Meta, StoryFn } from '@storybook/react-vite'
import React from 'react'
import type { NotificationProps } from '../components/Notifications/Notification'
import { Notification } from '../components/Notifications/Notification'

export default {
  title: 'Notifications',
} as Meta

const NotificationFn: StoryFn<NotificationProps> = (args) => <Notification {...args} />
export const NotificationStory = NotificationFn.bind({})
NotificationStory.argTypes = {
  type: {
    control: { type: 'radio' },
    options: ['error', 'success', 'info'],
  },
}

NotificationStory.args = {
  open: true,
  title: 'Notification Title',
  message: 'Message with details',
  type: 'error',
  link: {
    name: 'Some link',
    href: 'https://somelink.com/',
  },
}
NotificationStory.storyName = 'Notification'
