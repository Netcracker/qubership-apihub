import { type FC, memo } from 'react'

import { ContractPreviewPanel } from '@netcracker/qubership-apihub-ui-shared/components/ContractPreviewPanel'
import { McpEntityTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Mcp/McpEntityTitleWithMeta'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { JsonRawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/JsonRawSpecView'
import type { McpContractEntity, McpContractEntityDetails } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'

export type McpEntityPreviewProps = Readonly<{
  entity: McpContractEntity | undefined
  entityDetails: McpContractEntityDetails | undefined
  isLoading: boolean
  maxWidthHeaderToolbar?: number
}>

export const McpEntityPreview: FC<McpEntityPreviewProps> = memo<McpEntityPreviewProps>(({
  entity,
  entityDetails,
  isLoading,
  maxWidthHeaderToolbar,
}) => {
  const hasContent = !!entityDetails?.data

  return (
    <ContractPreviewPanel
      title={entity && <McpEntityTitleWithMeta onlyTitle entity={entity} />}
      isLoading={isLoading}
      hasContent={!!entity}
      maxWidthHeaderToolbar={maxWidthHeaderToolbar}
      data-testid="McpEntityPreview"
    >
      <Placeholder
        invisible={hasContent}
        area={CONTENT_PLACEHOLDER_AREA}
        message="No content"
        data-testid="NoContentPlaceholder"
      >
        <JsonRawSpecView
          data={entityDetails?.data}
          // TODO: Needs a larger refactor to centralise Doc/Raw view spacing for all specification kinds.
          sx={{ ml: -2, mr: 0, pb: 2 }}
        />
      </Placeholder>
    </ContractPreviewPanel>
  )
})

McpEntityPreview.displayName = 'McpEntityPreview'
