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
import { memo, useCallback, useMemo } from 'react'
import { Box, CardHeader, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material'
import { CloseOutlined as CloseOutlinedIcon } from '@mui/icons-material'
import type { PopupProps } from '../PopupDelegate'
import { PopupDelegate } from '../PopupDelegate'
import type { SpecViewMode } from '../SpecViewToggler'
import { SpecViewToggler } from '../SpecViewToggler'
import { isNotEmpty } from '../../utils/arrays'
import type { Spec } from '../../entities/specs'

export const SpecificationDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_SPECIFICATION_DIALOG}
      render={props => <SpecificationPopup {...props}/>}
    />
  )
})

export const SHOW_SPECIFICATION_DIALOG = 'show-specification-dialog'

export type SpecificationDialogDetail = {
  spec: Spec
  viewer: ReactNode
  viewModes: SpecViewMode[]
  viewMode: SpecViewMode
  setViewMode: (value: SpecViewMode) => void
  headerComponent?: ReactNode
  disableSpecViewToggler?: boolean
}

export const SpecificationPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const {
    spec,
    viewer,
    viewModes,
    viewMode,
    setViewMode,
    disableSpecViewToggler,
    headerComponent,
  } = detail as SpecificationDialogDetail

  const onClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  const defaultHeaderComponent = useMemo(() => (
      <CardHeader
        sx={{ p: 0 }}
        title={spec?.name}
        subheader={spec?.serviceKey}
      />
    ),
    [spec?.name, spec?.serviceKey],
  )

  return (
    <Dialog
      maxWidth={false}
      fullWidth
      open={open}
      onClose={onClose}
    >
      <DialogTitle display="flex">
        {headerComponent ?? defaultHeaderComponent}
        <Box display="flex" marginLeft="auto" alignItems="flex-start" gap={3}>
          {!disableSpecViewToggler && isNotEmpty(viewModes) && (
            <SpecViewToggler
              mode={viewMode}
              modes={viewModes!}
              onChange={setViewMode}
            />
          )}
          <IconButton
            sx={{ color: '#353C4E' }}
            onClick={onClose}
          >
            <CloseOutlinedIcon/>
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          height: '100vh',
        }}
      >
        <Box width="100%">
          {viewer}
        </Box>
      </DialogContent>
    </Dialog>
  )
})
