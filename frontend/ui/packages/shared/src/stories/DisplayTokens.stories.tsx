import type { Meta, StoryObj } from '@storybook/react-vite'
import { ThemeProvider } from '@mui/material'
import { DisplayToken } from '../components/DisplayToken'
import { theme } from '../themes/theme'

const meta: Meta<typeof DisplayToken> = {
  title: 'Display Token',
  component: DisplayToken,
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
    generatedApiKey: '12334343-54534454-343453453',
  },
}
