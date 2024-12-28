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

import type { FC } from 'react'
import { memo, useEffect } from 'react'
import { Box, debounce } from '@mui/material'
import { useSystemConfiguration } from '../hooks/authorization/useSystemConfiguration'
import { DEFAULT_AUTHORIZATION_DEBOUNCE, useAuthorization } from '../hooks/authorization'
import { useSystemInfo } from '../features/system-info'
import { redirectToSaml } from '../utils/redirects'

export const AuthPage: FC = memo(() => {
  const [auth] = useAuthorization()
  const [systemConfiguration] = useSystemConfiguration()
  useSystemInfo()

  useEffect(() => {
    if (!systemConfiguration) {
      return
    }
    debounce(() => {
      if (systemConfiguration.autoRedirect && !auth) {
        redirectToSaml()
      }
    }, DEFAULT_AUTHORIZATION_DEBOUNCE)
    if (!systemConfiguration.ssoIntegrationEnabled || !systemConfiguration.autoRedirect) {
      location.replace('/login')
    }
  }, [auth, systemConfiguration])

  return (
    <Box>
      Authentication is in progress...
    </Box>
  )
})
