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
import * as React from 'react'
import { memo, useCallback } from 'react'
import { Box, TextField, Typography } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useCopyToClipboard } from 'react-use'
import type { Key } from '../entities/keys'
import { InfoIcon } from '../icons/InfoIcon'

export type DisplayTokenProps = {
  generatedApiKey: Key
}

//First Order Component
export const DisplayToken: FC<DisplayTokenProps> = memo(({
  generatedApiKey,
}) => {
  const [, copyToClipboard] = useCopyToClipboard()

  const handleCopyToClipboard = useCallback(() => {
    copyToClipboard(generatedApiKey ?? '')
  }, [copyToClipboard, generatedApiKey])

  return (
    <Box>
      <TextField
        sx={{ width: '681px' }}
        label="Access token"
        value={generatedApiKey}
        InputProps={{ endAdornment: <ContentCopyIcon style={{ cursor: 'pointer' }} data-testid="CopyIcon"/> }}
        onClick={handleCopyToClipboard}
        data-testid="AccessTokenTextField"
      />
      <Box display="flex" alignItems="center" marginTop="4px" data-testid="TokenWarning">
        <InfoIcon/>
        <Typography sx={{ ml: '4px', fontSize: '12px', color: '#626D82' }}>
          Copy and save this token because it won’t be saved
        </Typography>
      </Box>
    </Box>
  )
})
