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
import React, { memo, useCallback } from 'react'
import { Box, Button, DialogActions, DialogContent, DialogTitle, Divider, Typography } from '@mui/material'
import type { PopupProps } from './PopupDelegate'
import { PopupDelegate } from './PopupDelegate'
import { DialogForm } from './DialogForm'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import type { TestableProps } from './Testable'

export const EmptyPackageDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_EMPTY_PACKAGE_DIALOG}
      render={props => <EmptyPackagePopup {...props}/>}
    />
  )
})

export const SHOW_EMPTY_PACKAGE_DIALOG = 'show-empty-package-dialog'

export type EmptyPackageItem = {
  label: string
  navigate: () => void
  description: string
} & TestableProps

export type ShowEmptyPackageDetail = {
  emptyPackageData: EmptyPackageItem[]
}

export const EmptyPackagePopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { emptyPackageData } = detail as ShowEmptyPackageDetail

  const onClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      width="440px"
    >
      <DialogTitle>
        Methods for API Documentation Upload
      </DialogTitle>
      <DialogContent sx={{
        width: 'auto',
        minWidth: 'unset',
      }}>
        {emptyPackageData.map(({ label, navigate, description, testId }, index) => (
          <React.Fragment key={index}>
            <Box
              sx={{ cursor: 'pointer' }}
              onClick={() => {
                onClose()
                navigate()
              }}
              data-testid={testId}
            >
              <Box display="flex" justifyContent="space-between">
                <Typography variant="subtitle1" fontSize={13}>
                  {label}
                </Typography>
                <ChevronRightIcon/>
              </Box>
              <Typography variant="body2" fontSize={13} maxWidth="352px">
                {description}
              </Typography>
            </Box>
            <Divider orientation="horizontal" sx={DIVIDER_STYLES}/>
          </React.Fragment>
        ))}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          onClick={onClose}
          data-testid="GotItButton"
        >
          Got it
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

const DIVIDER_STYLES = {
  borderWidth: '0 0 1px 0',
  borderColor: '#D9D9D9',
  margin: '9px 0',
}
