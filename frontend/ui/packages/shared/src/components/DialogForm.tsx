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
import { memo } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import type { DialogProps } from '@mui/material/Dialog/Dialog'
import { takeIfDefined } from '../utils/objects'

export type DialogFormProps = PropsWithChildren<Pick<DialogProps, 'open' | 'onClose'> & {
  onSubmit?: () => void
  width?: string
  maxWidth?: DialogProps['maxWidth']
}>

export const DialogForm: FC<DialogFormProps> = memo<DialogFormProps>(({
  open,
  onClose,
  onSubmit,
  children,
  width,
  maxWidth,
}) => {
  return (
    <Dialog
      maxWidth={maxWidth}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: '10px',
          ...takeIfDefined({ width }),
        },
      }}
    >
      <Box
        component="form"
        onSubmit={onSubmit}
      >
        {children}
      </Box>
    </Dialog>
  )
})
