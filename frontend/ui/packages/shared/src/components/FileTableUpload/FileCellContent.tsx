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

import type { FC, ReactNode } from 'react'
import { memo, useMemo } from 'react'
import { Box, Button } from '@mui/material'
import { TextWithOverflowTooltip } from '../TextWithOverflowTooltip'

export const FileCellContent: FC<{
  fileKey: string
  file: File
  getFileClickHandler: (file: File) => ((file: File) => void) | null
  getFileLeftIcon: (file: File) => ReactNode
  getFileRightIcon: (file: File) => ReactNode
}> = memo(({
  fileKey,
  file,
  getFileClickHandler,
  getFileLeftIcon,
  getFileRightIcon,
}) => {
  const onTitleClick = useMemo(() => getFileClickHandler(file), [file, getFileClickHandler])
  const leftIcon = useMemo(() => getFileLeftIcon(file), [file, getFileLeftIcon])
  const rightIcon = useMemo(() => getFileRightIcon(file), [file, getFileRightIcon])

  function handleTitleClick(): void {
    onTitleClick?.(file)
  }

  return (
    <Box
      key={fileKey}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex' }}>
        {leftIcon}
        <Button
          disabled={!onTitleClick}
          onClick={handleTitleClick}
          sx={{
            p: 0,
            height: '20px',
            ml: '4px',
            minWidth: 'fit-content',
          }}
          data-testid="FileTitleButton"
        >
          <TextWithOverflowTooltip tooltipText={file.name} sx={{ color: onTitleClick ? '#0068FF' : '#000000' }}>
            {file.name}
          </TextWithOverflowTooltip>
        </Button>
        {rightIcon}
      </Box>
    </Box>
  )
})
