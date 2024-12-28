/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Meta, StoryFn } from '@storybook/react'
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
