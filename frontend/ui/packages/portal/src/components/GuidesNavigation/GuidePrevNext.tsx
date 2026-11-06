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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Box, Button, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import type { NavigationContext } from '@portal/utils/guides-navigation'

export type GuidePrevNextProps = Readonly<{
  context?: NavigationContext
  sx?: Record<string, unknown>
}>

/** Previous / next guide links in reading order of the navigation tree. */
export const GuidePrevNext: FC<GuidePrevNextProps> = memo<GuidePrevNextProps>(({ context, sx }) => {
  if (!context?.previous && !context?.next) {
    return null
  }

  return (
    <Box display="flex" justifyContent="space-between" gap={2} sx={sx} data-testid="GuidePrevNext">
      <Box>
        {context.previous && (
          <Button
            component={RouterLink}
            to={context.previous.path}
            variant="outlined"
            startIcon={<ArrowBackIcon/>}
            sx={{ textTransform: 'none', textAlign: 'left' }}
            data-testid="PreviousGuideButton"
          >
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Previous</Typography>
              {context.previous.title}
            </Box>
          </Button>
        )}
      </Box>
      <Box>
        {context.next && (
          <Button
            component={RouterLink}
            to={context.next.path}
            variant="outlined"
            endIcon={<ArrowForwardIcon/>}
            sx={{ textTransform: 'none', textAlign: 'right' }}
            data-testid="NextGuideButton"
          >
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Next</Typography>
              {context.next.title}
            </Box>
          </Button>
        )}
      </Box>
    </Box>
  )
})
