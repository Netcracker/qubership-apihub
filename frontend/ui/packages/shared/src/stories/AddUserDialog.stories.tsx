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

import type { Meta, StoryObj } from '@storybook/react'
import { ThemeProvider } from '@mui/material'
import { AddUserPopup } from '../components/Users/AddUserDialog'
import { theme } from '../themes/theme'
import { USERS } from './samples/system-administrators-samples'
import { ROLES_LIST } from './samples/roles-samples'

const meta: Meta<typeof AddUserPopup> = {
  title: 'Add User Dialog',
  component: AddUserPopup,
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <Story/>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const AddUserDialogStory: Story = {
  name: 'Default',
  args: {
    open: true,
    users: USERS,
    roles: ROLES_LIST,
  },
}
