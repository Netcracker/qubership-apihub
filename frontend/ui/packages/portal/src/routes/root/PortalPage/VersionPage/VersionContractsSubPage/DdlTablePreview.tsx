import { type FC, memo, useState } from 'react'

import { ContractPreviewPanel } from '@netcracker/qubership-apihub-ui-shared/components/ContractPreviewPanel'
import { DdlTableTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Ddl/DdlTableTitleWithMeta'
import { DdlTableViewModeToggler } from '@netcracker/qubership-apihub-ui-shared/components/Ddl/DdlTableViewModeToggler'
import type { SpecViewMode } from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import { DOC_SPEC_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'
import type {
  DdlContractEntity,
  DdlContractEntityDetails,
} from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'

import { DdlTableContentView } from './DdlTableContentView'

export type DdlTablePreviewProps = {
  table: DdlContractEntity | undefined
  tableDetails: DdlContractEntityDetails | undefined
  isLoading: boolean
  maxWidthHeaderToolbar?: number
  noHeading?: boolean
}

export const DdlTablePreview: FC<DdlTablePreviewProps> = memo<DdlTablePreviewProps>((props) => {
  const {
    table,
    tableDetails,
    isLoading,
    maxWidthHeaderToolbar,
    noHeading = false,
  } = props

  const [viewMode, setViewMode] = useState<SpecViewMode>(DOC_SPEC_VIEW_MODE)

  return (
    <ContractPreviewPanel
      title={table && <DdlTableTitleWithMeta onlyTitle table={table} />}
      action={<DdlTableViewModeToggler mode={viewMode} onChange={setViewMode} />}
      isLoading={isLoading}
      hasContent={!!table}
      maxWidthHeaderToolbar={maxWidthHeaderToolbar}
      data-testid="DdlTablePreview"
    >
      <DdlTableContentView
        data={tableDetails}
        viewMode={viewMode}
        noHeading={noHeading}
      />
    </ContractPreviewPanel>
  )
})

DdlTablePreview.displayName = 'DdlTablePreview'
