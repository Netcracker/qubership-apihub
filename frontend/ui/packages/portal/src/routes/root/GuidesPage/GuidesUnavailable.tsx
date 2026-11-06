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

import { Box, Button, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo } from 'react'

import { redirectToLogin } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'

export type GuidesUnavailableProps = Readonly<{
  loginRequired?: boolean
}>

export const GuidesUnavailable: FC<GuidesUnavailableProps> = memo<GuidesUnavailableProps>(({ loginRequired = false }) => (
  <Box sx={{ px: { xs: 3, md: 10 }, py: 10, textAlign: 'center' }} data-testid="GuidesUnavailable">
    <Typography variant="h1" component="h2">
      {loginRequired ? 'Login to read the guides' : 'Guides are not available'}
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
      {loginRequired
        ? 'Anonymous access to documentation is disabled on this instance.'
        : 'The documentation service is not configured on this instance.'}
    </Typography>
    {loginRequired && (
      <Button variant="contained" sx={{ mt: 3 }} onClick={redirectToLogin} data-testid="GuidesLoginButton">
        Login
      </Button>
    )}
  </Box>
))
