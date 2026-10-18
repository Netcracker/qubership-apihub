import { PopupDelegate } from '@netcracker/qubership-apihub-ui-shared/components/PopupDelegate'
import type { FC } from 'react'
import { ExportSettingsPopup } from './ExportSettingsPopup'

export const SHOW_EXPORT_SETTINGS_DIALOG = 'show-export-settings-dialog'

export const ExportSettingsDialog: FC = () => {
  return (
    <PopupDelegate
      type={SHOW_EXPORT_SETTINGS_DIALOG}
      render={props => <ExportSettingsPopup {...props} />}
    />
  )
}
