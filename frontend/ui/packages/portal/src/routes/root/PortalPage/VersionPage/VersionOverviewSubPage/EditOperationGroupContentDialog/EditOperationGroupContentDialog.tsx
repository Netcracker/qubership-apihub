import type { FC } from 'react'
import { Popup } from './internal/components/Popup'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { SHOW_EDIT_OPERATION_GROUP_CONTENT_DIALOG } from '@portal/routes/EventBusProvider'

export const EditOperationGroupContentDialog: FC = () => {
  return (
    <PopupDelegate
      type={SHOW_EDIT_OPERATION_GROUP_CONTENT_DIALOG}
      render={props => <Popup {...props} />}
    />
  )
}
