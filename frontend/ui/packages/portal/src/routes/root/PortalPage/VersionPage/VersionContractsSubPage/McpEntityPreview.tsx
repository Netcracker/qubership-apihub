import { type FC, memo } from 'react'

import { ContractPreviewPanel } from '@netcracker/qubership-apihub-ui-shared/components/ContractPreviewPanel'
import { McpEntityTitleWithMeta } from '@netcracker/qubership-apihub-ui-shared/components/Mcp/McpEntityTitleWithMeta'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { JsonRawSpecView } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/JsonRawSpecView'
import type { McpEntity, McpEntityDetails } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'

export type McpEntityPreviewProps = Readonly<{
  entity: McpEntity | undefined
  entityDetails: McpEntityDetails | undefined
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
        <JsonRawSpecView data={entityDetails?.data} />
      </Placeholder>
    </ContractPreviewPanel>
  )
})

McpEntityPreview.displayName = 'McpEntityPreview'
