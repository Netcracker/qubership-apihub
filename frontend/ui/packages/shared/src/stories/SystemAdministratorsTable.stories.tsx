import type { Meta, StoryObj } from '@storybook/react-vite'
import { Box, ThemeProvider } from '@mui/material'
import { theme } from '../themes/theme'
import { SystemAdministratorsTable } from '../components/SystemAdministratorsTable'
import { SYSTEM_ADMINISTRATORS } from './samples/system-administrators-samples'

const meta: Meta<typeof SystemAdministratorsTable> = {
  title: 'System Administrators Table',
  component: SystemAdministratorsTable,
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <Box sx={{ width: '1200px' }}>
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
    data: SYSTEM_ADMINISTRATORS,
    deleteAdministrator: (admin) => console.log(`Admin was deleted ${admin.name}`),
    isLoading: false,
  },
}
