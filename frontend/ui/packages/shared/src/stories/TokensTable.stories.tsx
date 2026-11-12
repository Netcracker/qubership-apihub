import type { Meta, StoryObj } from '@storybook/react-vite'
import { Box, ThemeProvider } from '@mui/material'
import { theme } from '../themes/theme'
import { TokensTable } from '../components/TokensTable'
import { TOKENS_LIST } from './samples/tokens-samples'

const meta: Meta<typeof TokensTable> = {
  title: 'Tokens Table',
  component: TokensTable,
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
    data: TOKENS_LIST,
    isLoading: false,
    disableDelete: false,
    deleteApiKey: () => console.log('deleteApiKey'),
  },
}
