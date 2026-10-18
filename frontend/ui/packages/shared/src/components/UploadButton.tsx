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

import type { ChangeEvent, FC } from 'react'
import { memo } from 'react'
import type { ButtonProps } from '@mui/material'
import { Box, Button } from '@mui/material'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import type { SxProps } from '@mui/system'

export type UploadButtonProps = {
  title: string
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  acceptableFileTypes?: string[]
  buttonSxProp?: SxProps
  withIcon?: boolean
  multiple?: boolean
} & ButtonProps

export const UploadButton: FC<UploadButtonProps> = memo<UploadButtonProps>(({
  title,
  acceptableFileTypes,
  onUpload,
  withIcon = false,
  buttonSxProp,
  multiple = false,
  ...buttonProps
}) => {
  return (
    <Box
      component="label"
      htmlFor="contained-button-file"
    >
      <Box
        component="input"
        id="contained-button-file"
        display="none"
        multiple={multiple}
        type="file"
        accept={acceptableFileTypes?.toString()}
        onChange={onUpload}
        onClick={(event) => {
          // Reset the input value to allow the same file to be selected again
          event.currentTarget.value = ''
        }}
        data-testid="UploadButtonInput"
      />
      <Button
        sx={buttonSxProp}
        component="span"
        startIcon={withIcon ? <CloudUploadOutlinedIcon/> : undefined}
        {...buttonProps}
      >
        {title}
      </Button>
    </Box>
  )
})
