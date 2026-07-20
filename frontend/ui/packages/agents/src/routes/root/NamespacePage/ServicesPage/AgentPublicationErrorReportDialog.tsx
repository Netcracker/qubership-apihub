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
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PublicationErrorReportDialog } from '@netcracker/qubership-apihub-ui-shared/components/PublicationErrorReportDialog'
import type { ShowPublicationErrorReportDetail } from '../../../EventBusProvider'
import { SHOW_PUBLICATION_ERROR_REPORT_DIALOG } from '../../../EventBusProvider'


export const AgentPublicationErrorReportDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_PUBLICATION_ERROR_REPORT_DIALOG}
      render={props => <AgentPublicationErrorReportPopup {...props}/>}
    />
  )
})
AgentPublicationErrorReportDialog.displayName = 'AgentPublicationErrorReportDialog'

const AgentPublicationErrorReportPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { downloadFilename, errors } = detail as ShowPublicationErrorReportDetail
  return (
    <PublicationErrorReportDialog
      open={open}
      onClose={() => setOpen(false)}
      downloadFilename={downloadFilename}
      errors={errors}
    />
  )
})
AgentPublicationErrorReportPopup.displayName = 'AgentPublicationErrorReportPopup'
