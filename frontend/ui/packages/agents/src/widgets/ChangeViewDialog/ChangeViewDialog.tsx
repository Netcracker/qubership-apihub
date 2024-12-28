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
import { memo, useCallback } from 'react'

import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { Box, CardHeader, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material'
import { ChangesViewAgentWidget } from './ChangesViewAgentWidget'
import type { Service } from '@apihub/entities/services'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import {
  useCreateSnapshotPublicationOptions,
} from '../../routes/root/NamespacePage/ServicesPage/ServicesPageProvider/ServicesPublicationOptionsProvider'
import type { ServiceConfig } from '@apihub/entities/publish-config'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export const SHOW_CHANGE_VIEW_DIALOG = 'show-change-view-dialog'

export type ChangeViewDialogDetail = {
  service: Service
  viewChangesUrl?: string
  apiType?: ApiType
}

export const ChangeViewContent: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { service, apiType } = detail as ChangeViewDialogDetail
  const { createSnapshotPublicationOptions: { config } } = useCreateSnapshotPublicationOptions()
  const {
    version,
    packageId,
  } = config?.serviceConfigs.find(({ serviceId }) => serviceId === service.key) as ServiceConfig

  const onClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  return (
    <Dialog
      maxWidth="lg"
      fullWidth
      open={open}
      onClose={onClose}
    >
      <DialogTitle display="flex">
        <CardHeader
          sx={{ p: 0 }}
          title="Changelog"
        />
        <Box display="flex" marginLeft="auto" alignItems="center" gap={3}>
          <IconButton
            sx={{ color: '#353C4E' }}
            onClick={onClose}
          >
            <CloseOutlinedIcon/>
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ width: '100%' }}>
        <ChangesViewAgentWidget
          versionKey={version}
          packageKey={packageId}
          apiType={apiType}
        />
      </DialogContent>
    </Dialog>
  )
})

export const ChangeViewDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_CHANGE_VIEW_DIALOG}
      render={props => <ChangeViewContent {...props}/>}
    />
  )
})
