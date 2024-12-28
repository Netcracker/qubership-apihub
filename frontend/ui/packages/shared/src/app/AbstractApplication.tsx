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

import type { FC, PropsWithChildren } from 'react'
import { memo, StrictMode, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useLocation } from 'react-use'
import { RouterProvider } from 'react-router-dom'
import type { Router } from '@remix-run/router'
import { useAuthorization } from '../hooks/authorization'
import { isTokenExpired } from '../entities/token-payload'
import { getToken } from '../utils/storages'
import { theme } from '../themes/theme'
import { AuthPage } from '../pages/AuthPage'

const client = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  },
})

export type ApplicationProps = {
  isSecure: boolean
  routing: Router
}

export const CheckAuthorization: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [auth, setAuth] = useState<boolean>(!isTokenExpired(getToken()))
  useAuthorization({ setLogin: setAuth })
  const location = useLocation()
  const isLoginPage = location.pathname?.startsWith('/login') // This is done for new routing approach, refactor it

  return auth || isLoginPage
    ? <>{children}</>
    : <AuthPage/>
})

export const AbstractApplication: FC<ApplicationProps> = memo<ApplicationProps>(({ isSecure, routing }) => {
  return (
    <StrictMode>
      <QueryClientProvider client={client}>
        <ThemeProvider theme={theme}>
          <CssBaseline/>
          {isSecure
            ? (
              <CheckAuthorization>
                <RouterProvider router={routing}/>
              </CheckAuthorization>
            )
            : <RouterProvider router={routing}/>
          }
        </ThemeProvider>
        <ReactQueryDevtools initialIsOpen={false}/>
      </QueryClientProvider>
    </StrictMode>
  )
})
