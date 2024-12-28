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
import { DEFAULT_PAGE_LAYOUT_GAP } from '../utils/page-layouts'
import { DEFAULT_PAPER_SHADOW } from '../themes/palette'
import { HomeIcon } from '../icons/HomeIcon'

export type ErrorPageProps = {
  title: string
  message?: string
  homePath: string
}

export const ErrorPage: FC<ErrorPageProps> = memo<ErrorPageProps>(({
  title,
  message,
  homePath,
}) => (
  <Box
    sx={{
      pt: DEFAULT_PAGE_LAYOUT_GAP,
      px: DEFAULT_PAGE_LAYOUT_GAP,
      height: '100%',
    }}
  >
    <Box sx={{
      height: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: '10px 10px 0 0',
      boxShadow: DEFAULT_PAPER_SHADOW,
    }}>
      <Placeholder
        invisible={false}
        area={CONTENT_PLACEHOLDER_AREA}
        message={
          <Box flex={1} display="flex" flexDirection="column" gap={1} alignItems="center">
            <Typography component="div" variant="h5" fontSize={20} textAlign="center">{title}</Typography>
            {message && <Typography component="div" variant="h6" color="#626D82">{message}</Typography>}
            <Button
              size="medium"
              startIcon={<HomeIcon/>}
              variant="text"
              href={homePath}
              sx={{
                '& .MuiButton-startIcon': {
                  marginRight: '4px',
                },
              }}
            >
              Go to home page
            </Button>
          </Box>
        }
      />
    </Box>
  </Box>
))

export const NOT_FOUND_TITLE = 'Page Not Found'
export const SOMETHING_WENT_WRONG_TITLE = 'Something Went Wrong'
