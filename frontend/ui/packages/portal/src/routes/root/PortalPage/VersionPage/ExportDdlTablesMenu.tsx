import { type FC, memo } from 'react'
import { useParams } from 'react-router-dom'

import { ExportMenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ExportMenuButton'

import { useFullMainVersion } from '../FullMainVersionProvider'
import { useDownloadDdlTablesAsExcel } from './useDownloadDdlTablesAsExcel'

export type ExportDdlTablesMenuProps = Readonly<{
  textFilter?: string
  refPackageId?: string
  disabled?: boolean
}>

export const ExportDdlTablesMenu: FC<ExportDdlTablesMenuProps> = memo<ExportDdlTablesMenuProps>(({
  textFilter,
  refPackageId,
  disabled,
}) => {
  const { packageId } = useParams()
  const fullVersion = useFullMainVersion()
  const [downloadDdlTablesAsExcel] = useDownloadDdlTablesAsExcel()

  const onDownloadAll = (): void => {
    downloadDdlTablesAsExcel({
      packageKey: packageId!,
      version: fullVersion!,
    })
  }

  const onDownloadFiltered = (): void => {
    downloadDdlTablesAsExcel({
      packageKey: packageId!,
      version: fullVersion!,
      textFilter: textFilter,
      refPackageId: refPackageId,
    })
  }

  return (
    <ExportMenuButton
      title="Export Tables to Excel"
      disabled={disabled}
      allDownloadText="All tables"
      filteredDownloadText="Filtered tables"
      downloadAll={onDownloadAll}
      downloadFiltered={onDownloadFiltered}
    />
  )
})

ExportDdlTablesMenu.displayName = 'ExportDdlTablesMenu'
