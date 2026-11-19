import { CssBaseline, ThemeProvider } from '@mui/material'
import { theme } from '@netcracker/qubership-apihub-ui-shared/themes/theme'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { FC } from 'react'
import { memo, StrictMode } from 'react'
import { Router } from './routes/Router'
import { useSystemConfiguration } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useSystemConfiguration'
import { AppPlaceholder } from '@netcracker/qubership-apihub-ui-shared/components/AppPlaceholder'
const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  },
})

const AppInner: FC = memo(() => {
  const [systemConfiguration] = useSystemConfiguration()

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {systemConfiguration
        ? <Router />
        : <AppPlaceholder />}
    </ThemeProvider>
  )
})

export const App: FC = memo(() => {
  return (
    <StrictMode>
      <QueryClientProvider client={client}>
        <AppInner />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </StrictMode>
  )
})
