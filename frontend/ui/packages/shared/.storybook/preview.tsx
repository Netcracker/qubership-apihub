import React from 'react'
import type { Preview } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { theme } from '../src/themes/theme'

/**
 * Stub client — Storybook never talks to a backend.
 *
 * It exists only so components that query on their own (VersionDialogForm, for example) can render:
 * without a provider `useQuery` throws. No story actually fetches — each one supplies its data
 * through props, which keeps the corresponding queries disabled — and no API proxy is configured for
 * the Storybook dev server, so a stray request would only reach its own origin. `retry: false` keeps
 * such a request from being repeated.
 */
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            <CssBaseline/>
            <Story/>
          </ThemeProvider>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
}

export default preview
