import { type FC, memo, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { ExportMenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ExportMenuButton'
import {
  MCP_COLLECTION_INIT,
  MCP_COLLECTION_LABELS,
  type McpCollection,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'

import { useFullMainVersion } from '../FullMainVersionProvider'
import { useDownloadMcpEntitiesAsExcel } from './useDownloadMcpEntitiesAsExcel'

const MCP_COLLECTION_EXPORT_LABELS: Record<McpCollection, string> = {
  ...MCP_COLLECTION_LABELS,
  [MCP_COLLECTION_INIT]: 'Overviews',
}

type ExportMcpEntitiesMenuProps = Readonly<{
  collection: McpCollection
  textFilter?: string
  refPackageId?: string
  disabled?: boolean
}>

export const ExportMcpEntitiesMenu: FC<ExportMcpEntitiesMenuProps> = memo(({
  collection,
  textFilter,
  refPackageId,
  disabled,
}) => {
  const { packageId } = useParams()
  const fullVersion = useFullMainVersion()
  const [downloadMcpEntitiesAsExcel] = useDownloadMcpEntitiesAsExcel()

  const collectionLabel = MCP_COLLECTION_EXPORT_LABELS[collection]
  const collectionLabelLower = collectionLabel.toLowerCase()

  const { title, allDownloadText, filteredDownloadText } = useMemo(() => ({
    title: `Export ${collectionLabel} to Excel`,
    allDownloadText: `All ${collectionLabelLower}`,
    filteredDownloadText: `Filtered ${collectionLabelLower}`,
  }), [collectionLabel, collectionLabelLower])

  const onDownloadAll = (): void => {
    downloadMcpEntitiesAsExcel({
      packageKey: packageId!,
      version: fullVersion!,
      collection: collection,
    })
  }

  const onDownloadFiltered = (): void => {
    downloadMcpEntitiesAsExcel({
      packageKey: packageId!,
      version: fullVersion!,
      collection: collection,
      textFilter: textFilter,
      refPackageId: refPackageId,
    })
  }

  return (
    <ExportMenuButton
      title={title}
      disabled={disabled}
      allDownloadText={allDownloadText}
      filteredDownloadText={filteredDownloadText}
      downloadAll={onDownloadAll}
      downloadFiltered={onDownloadFiltered}
    />
  )
})

ExportMcpEntitiesMenu.displayName = 'ExportMcpEntitiesMenu'
