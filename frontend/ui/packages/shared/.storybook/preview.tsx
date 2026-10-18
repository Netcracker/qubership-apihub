/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
