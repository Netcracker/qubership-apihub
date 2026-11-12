import type { FC } from 'react'
import { memo } from 'react'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PublicationErrorReportDialog } from '@netcracker/qubership-apihub-ui-shared/components/PublicationErrorReportDialog'
import type { ShowPublicationErrorReportDetail } from '../../../EventBusProvider'
import { SHOW_PUBLICATION_ERROR_REPORT_DIALOG } from '../../../EventBusProvider'

export const PortalPublicationErrorReportDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_PUBLICATION_ERROR_REPORT_DIALOG}
      render={props => <PortalPublicationErrorReportPopup {...props}/>}
    />
  )
})

PortalPublicationErrorReportDialog.displayName = 'PortalPublicationErrorReportDialog'

const PortalPublicationErrorReportPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
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

PortalPublicationErrorReportPopup.displayName = 'PortalPublicationErrorReportPopup'
