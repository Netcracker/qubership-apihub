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
import { Box, Button } from '@mui/material'

export type UnsupportedFilePlaceholderProps = {
  onDownload?: () => void
  message: string
}

export const UnsupportedFilePlaceholder: FC<UnsupportedFilePlaceholderProps> = memo<UnsupportedFilePlaceholderProps>(({
  onDownload,
  message,
}) => {
  return (
    <Box height="100%" display="flex" alignItems="center" data-testid="UnsupportedFilePlaceholder">
      <Box sx={{
        display: 'grid',
        justifyItems: 'center',
        width: '100%',
        gridTemplateAreas: `
          'title'
          'button'
      `,
      }}>
        <Box sx={{ gridArea: 'title' }}>
          {message}
        </Box>
        {
          onDownload &&
          <Button sx={{ gridArea: 'button' }} onClick={onDownload} data-testid="DownloadButton">
            Download
          </Button>
        }
      </Box>
    </Box>
  )
})
