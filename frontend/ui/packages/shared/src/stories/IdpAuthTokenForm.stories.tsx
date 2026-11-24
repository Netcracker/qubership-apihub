import type { Meta, StoryObj } from '@storybook/react-vite'
import { ThemeProvider } from '@mui/material'
import { theme } from '../themes/theme'
import { IdpAuthTokenForm } from '../components/IdpAuthTokenForm'

const meta: Meta<typeof IdpAuthTokenForm> = {
  title: 'Idp Auth Token Form',
  component: IdpAuthTokenForm,
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
    isLoading: false,
    defaultIdpUrl: 'https://private-gateway.kuber-apps.cloud.example.com',
    onGetUdpAuthToken: () => console.log('getUdpAuthToken'),
  },
}
