import type { Meta, StoryObj } from '@storybook/react-vite'
import { ThemeProvider } from '@mui/material'
import { GenerateTokenForm } from '../components/GenerateTokenForm'
import { theme } from '../themes/theme'

const meta: Meta<typeof GenerateTokenForm> = {
  title: 'Generate Token Form',
  component: GenerateTokenForm,
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
    roles: ['Admin', 'Viewer'],
    disabled: false,
    isLoading: false,
    generatedApiKey: '',
    generateApiKey: () => console.log('generateApiKey'),
    setUserSearch: () => {},
  },
}
