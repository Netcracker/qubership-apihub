import { ErrorHandler } from '@portal/components/ErrorHandler'
import { EventBusProvider } from '@portal/routes/EventBusProvider'
import { router } from '@portal/routes/Router'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { AppPlaceholder } from '@netcracker/qubership-apihub-ui-shared/components/AppPlaceholder'
import { useUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import { useSystemConfiguration } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useSystemConfiguration'
import { theme } from '@netcracker/qubership-apihub-ui-shared/themes/theme'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { FC } from 'react'
import { memo, StrictMode } from 'react'
import { RouterProvider } from 'react-router-dom'

const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
})

const AppInner: FC = memo(() => {
  const [systemConfiguration] = useSystemConfiguration()
  const isLoginPage = location.pathname === '/login'
  const [user] = useUser(!!systemConfiguration)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorHandler>
        <EventBusProvider>
          {systemConfiguration && (isLoginPage || user)
            ? <RouterProvider router={router} />
            : <AppPlaceholder />}
        </EventBusProvider>
      </ErrorHandler>
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
