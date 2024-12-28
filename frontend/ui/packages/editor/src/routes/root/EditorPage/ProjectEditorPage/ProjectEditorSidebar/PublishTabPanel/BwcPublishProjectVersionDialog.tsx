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
import { memo, useEffect, useMemo } from 'react'
import { Button, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import type { BwcPublishProjectVersionDialogDetail } from '../../../../../EventBusProvider'
import { SHOW_BWC_PUBLISH_PROJECT_VERSION_DIALOG } from '../../../../../EventBusProvider'
import { LoadingButton } from '@mui/lab'
import { usePublishProjectVersion } from '../../usePublishProjectVersion'
import { useSaveChanges } from '../../useSaveChanges'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { waitForSocketEvent } from '@netcracker/qubership-apihub-ui-shared/utils/sockets'

export const BwcPublishProjectVersionDialog: FC = memo(() => (
  <PopupDelegate
    type={SHOW_BWC_PUBLISH_PROJECT_VERSION_DIALOG}
    render={props => <BwcPublishProjectVersionPopup {...props}/>}
  />
))

const BwcPublishProjectVersionPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const [message = '', version = '', status = '', previousVersion = '', labels = []] = useMemo(() => {
    if (!detail) {
      return []
    }

    const { message, version, status, previousVersion, labels } = detail as BwcPublishProjectVersionDialogDetail
    return [message, version, status, previousVersion, labels]
  }, [detail])

  const [saveChanges, isSaveLoading] = useSaveChanges()
  const [publishProject, isPublishLoading, isPublishSuccess] = usePublishProjectVersion()

  useEffect(() => {
    !isPublishLoading && isPublishSuccess && setOpen(false)
  }, [isPublishLoading, isPublishSuccess, isSaveLoading, setOpen])

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
    >
      <DialogTitle>
        Backward Compatibility Problems
      </DialogTitle>

      <DialogContent sx={{ width: 440 }}>
        <DialogContentText
          variant="body2"
          sx={{ color: 'black' }}
        >
          There are breaking changes in current version. Do you want to publish it anyway?
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <LoadingButton
          variant="contained"
          loading={isSaveLoading || isPublishLoading}
          onClick={async () => {
            message && await saveChanges({ message })
            await waitForSocketEvent()
            publishProject({ version, status, previousVersion, labels })
          }}
        >
          Publish
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})
