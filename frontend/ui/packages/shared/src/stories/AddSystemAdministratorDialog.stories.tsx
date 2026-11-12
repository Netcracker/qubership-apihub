import type { Meta, StoryObj } from '@storybook/react-vite'

import { ThemeProvider } from '@mui/material'
import { AddSystemAdministratorPopup } from '../components/AddSystemAdministratorDialog'
import { theme } from '../themes/theme'
import { USERS } from './samples/system-administrators-samples'

const meta: Meta<typeof AddSystemAdministratorPopup> = {
  title: 'System Administrators Dialog',
  component: AddSystemAdministratorPopup,
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

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    open: true,
    users: USERS,
    setUserSearch: () => {},
  },
}
