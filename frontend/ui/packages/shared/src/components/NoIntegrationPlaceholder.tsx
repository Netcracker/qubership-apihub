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
import { memo } from 'react'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from './Placeholder'
import { Button, Typography } from '@mui/material'
import Box from '@mui/material/Box'
import { useAuthorization } from '../hooks/authorization'
import { redirectToGitlab } from '../utils/redirects'

export const NoIntegrationPlaceholder: FC = memo(() => {
  const [, , removeAuth] = useAuthorization()

  return (
    <Placeholder
      invisible={false}
      area={CONTENT_PLACEHOLDER_AREA}
      message={
        <Box flex={1} flexDirection="column">
          <Button
            size="medium"
            variant="contained"
            onClick={() => {
              redirectToGitlab()
              removeAuth()
            }}
            style={{
              background: '#00BB5B',
              marginBottom: '15px',
            }}
          >
            Connect
          </Button>

          <Typography component="div" variant="h3" color="#8F9EB4">
            Authorize APIHUB application to use your GitLab account
          </Typography>
          <Typography component="div" variant="h3" color="#8F9EB4">
            This is required to use Editor
          </Typography>
        </Box>
      }
    />
  )
})
