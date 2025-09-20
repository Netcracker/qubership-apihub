import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import type { PopupProps } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'
import { SHOW_DELETE_CUSTOM_SERVER_DIALOG } from '@netcracker/qubership-apihub-ui-portal/src/routes/EventBusProvider'
import { useCustomServersPackageMap } from '../hooks/useCustomServersPackageMap'

export const DeleteCustomServerDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_DELETE_CUSTOM_SERVER_DIALOG}
      render={props => <DeleteCustomServerPopup {...props} />}
    />
  )
})

const DeleteCustomServerPopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const { packageId = '' } = useParams()
  const [customServers, updateCustomServers] = useCustomServersPackageMap()

  const { url } = detail || {}

  const handleDeleteCustomServer = useCallback(() => {
    if (!url) {
      return
    }

    const packageServers = customServers[packageId] ?? []
    const updatedServers = packageServers.filter(server => server.url !== url)

    updateCustomServers(packageId, updatedServers)
    setOpen(false)
  }, [customServers, packageId, setOpen, updateCustomServers, url])

  return (
    <ConfirmationDialog
      open={open}
      title={`Delete "${url}" server?`}
      onConfirm={handleDeleteCustomServer}
      onCancel={() => setOpen(false)}
    />
  )
})

DeleteCustomServerDialog.displayName = 'DeleteCustomServerDialog'
