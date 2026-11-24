import type { Meta, StoryObj } from '@storybook/react-vite'
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
    setUserSearch: () => {},
    roles: ROLES_LIST,
  },
}
