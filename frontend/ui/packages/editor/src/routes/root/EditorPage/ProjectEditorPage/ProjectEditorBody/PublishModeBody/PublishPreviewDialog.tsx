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
import { memo, useState } from 'react'
import { SHOW_PUBLISH_PREVIEW_DIALOG } from '../../../../../EventBusProvider'
import { Box, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { useSelectedPreviewFile } from '../../useSelectedPreviewFile'
import { Resizable } from 're-resizable'
import { useBranchCache } from '../../useBranchCache'
import { useDereferencedSpec } from '../../useDereferencedSpec'
import { RawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/RawSpecView'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { SpecViewMode } from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import {
  DOC_SPEC_VIEW_MODE,
  RAW_SPEC_VIEW_MODE,
  SpecViewToggler,
} from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import { useSpecItemUriHashParam } from '@netcracker/qubership-apihub-ui-shared/hooks/hashparams/useSpecItemUriHashParam'
import { UNKNOWN_SPEC_TYPE } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { getFileExtension, UNKNOWN_FILE_FORMAT } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import {
  NAVIGATION_DEFAULT_WIDTH,
  NAVIGATION_MAX_WIDTH,
  NAVIGATION_MIN_WIDTH,
} from '@netcracker/qubership-apihub-ui-shared/utils/page-layouts'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { PORTAL_SPEC_VIEW_MODES } from '@apihub/entities/spec-view-mode'
import { SpecNavigation } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/SpecNavigation'
import { DocSpecView } from '@apihub/components/DocSpecView'

export const PublishPreviewDialog: FC = memo(() => (
  <PopupDelegate
    type={SHOW_PUBLISH_PREVIEW_DIALOG}
    render={props => <PublishPreviewPopup {...props}/>}
  />
))

const PublishPreviewPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen }) => {
  const [specViewMode, setSpecViewMode] = useState<SpecViewMode>(DOC_SPEC_VIEW_MODE)
  const { name } = useSelectedPreviewFile() ?? {}

  return (
    <Dialog
      maxWidth={false}
      fullWidth
      open={open}
      onClose={() => setOpen(false)}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        {name} Preview
        <Box display="flex" marginLeft="auto" alignItems="center" gap={3}>
          <SpecViewToggler
            mode={specViewMode}
            modes={PORTAL_SPEC_VIEW_MODES}
            onChange={setSpecViewMode}
          />
          <IconButton
            sx={{ color: '#353C4E' }}
            onClick={() => setOpen(false)}
          >
            <CloseOutlinedIcon/>
          </IconButton>
        </Box>
      </DialogTitle>

      <PublishPreviewDialogContent
        mode={specViewMode as SpecViewMode}
      />
    </Dialog>
  )
})

type PublishPreviewDialogContentProps = {
  mode: SpecViewMode
}

const PublishPreviewDialogContent: FC<PublishPreviewDialogContentProps> = ({ mode }) => {
  const [specItemUri, setSpecItemUri] = useSpecItemUriHashParam()

  const { key = '', name = '' } = useSelectedPreviewFile() ?? {}
  const [branchCache, isLoading] = useBranchCache()
  const [dereferencedSpec] = useDereferencedSpec(key)

  const { type, format, content } = branchCache[key] ?? {
    type: UNKNOWN_SPEC_TYPE,
    format: UNKNOWN_FILE_FORMAT,
    content: '',
  }

  return (
    <DialogContent
      sx={{
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <Resizable
        style={{
          display: mode === DOC_SPEC_VIEW_MODE ? 'none' : 'inline',
          overflow: 'hidden',
          position: 'relative',
          borderRight: '1px solid #D5DCE3',
        }}
        handleStyles={{ right: { cursor: 'ew-resize' } }}
        defaultSize={{ width: NAVIGATION_DEFAULT_WIDTH, height: '100%' }}
        maxWidth={NAVIGATION_MAX_WIDTH}
        minWidth={NAVIGATION_MIN_WIDTH}
        enable={{
          top: false,
          right: true,
          bottom: false,
          left: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
      >
        <SpecNavigation
          content={dereferencedSpec}
          selectedUri={specItemUri}
          onSelect={setSpecItemUri}
        />
      </Resizable>
      <Box width="100%" height="100%" px={4}>
        {
          isLoading
            ? <LoadingIndicator/>
            : mode === RAW_SPEC_VIEW_MODE
              ? <RawSpecView extension={getFileExtension(name)} type={type} value={content} selectedUri={specItemUri}/>
              : <DocSpecView type={type} format={format} value={dereferencedSpec} sidebarEnabled/>
        }
      </Box>
    </DialogContent>
  )
}
