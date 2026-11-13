import type { Meta, StoryObj } from '@storybook/react-vite'
import { Box, ThemeProvider } from '@mui/material'
import { theme } from '../themes/theme'
import { RolesList } from '../components/RolesList'
import { ROLES_LIST } from './samples/roles-samples'

const meta: Meta<typeof RolesList> = {
  title: 'Roles List',
  component: RolesList,
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <Box sx={{ width: '800px' }}>
          <Story/>
        </Box>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStory: Story = {
  name: 'Default',
  args: {
    roles: ROLES_LIST,
  },
}
