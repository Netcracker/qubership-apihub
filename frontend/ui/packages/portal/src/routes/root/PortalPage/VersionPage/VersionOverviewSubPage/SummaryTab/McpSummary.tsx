import { type FC, memo } from 'react'

import { ApiTypeErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/ApiTypeErrorIndicator'
import {
  CONTRACT_TYPE_MCP,
  CONTRACT_TYPE_TITLE_MAP,
} from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import type { McpContractsSummary } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-mcp'
import type { ApiTypeProblemDetails } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/apiTypeProblemDetails'

import { SummaryPanels } from './SummaryPanel'
import { SummarySection } from './SummarySection'

type McpSummaryProps = Readonly<{
  mcpSummary: McpContractsSummary
  problem?: ApiTypeProblemDetails
}>

export const McpSummary: FC<McpSummaryProps> = memo(({ mcpSummary, problem }) => {
  const { totals } = mcpSummary
  const showEndpoints = totals.endpoints > 1

  return (
    <SummarySection
      title={
        <>
          {CONTRACT_TYPE_TITLE_MAP[CONTRACT_TYPE_MCP]}
          <ApiTypeErrorIndicator
            problem={problem}
            data-testid={`OverviewSummaryErrorIndicator-${CONTRACT_TYPE_MCP}`}
          />
        </>
      }
      data-testid="McpContractSummary"
    >
      <SummaryPanels
        numbers={{
          metrics: [
            {
              label: 'MCP Endpoints',
              value: totals.endpoints,
              visible: showEndpoints,
              'data-testid': 'McpCount-McpEndpoints',
            },
            {
              label: 'Total number of tools',
              value: totals.toolsCount,
              'data-testid': 'McpCount-Tools',
            },
            {
              label: 'Total number of resources',
              value: totals.resourcesCount,
              'data-testid': 'McpCount-Resources',
            },
            {
              label: 'Total number of prompts',
              value: totals.promptsCount,
              'data-testid': 'McpCount-Prompts',
            },
          ],
        }}
      />
    </SummarySection>
  )
})

McpSummary.displayName = 'McpSummary'
