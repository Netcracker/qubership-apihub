import { type FC, memo } from 'react'

import { DEFAULT_CHANGE_SEVERITY_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import {
  CONTRACT_TYPE_DDL,
  CONTRACT_TYPE_TITLE_MAP,
} from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import type { DdlContractsSummary } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-ddl'

import { buildBwcValidationMetrics } from './bwcValidationMetrics'
import { SUMMARY_IMPACTED_ENTITY_TABLES } from './entities'
import { SummaryPanels } from './SummaryPanel'
import { SummarySection } from './SummarySection'

type DdlSummaryProps = Readonly<{
  ddlSummary: DdlContractsSummary
}>

export const DdlSummary: FC<DdlSummaryProps> = memo(({ ddlSummary }) => {
  return (
    <SummarySection data-testid="DdlContractSummary">
      <SummaryPanels
        numbers={{
          title: CONTRACT_TYPE_TITLE_MAP[CONTRACT_TYPE_DDL],
          metrics: [
            {
              label: 'Total number of tables',
              value: ddlSummary.tablesCount,
              'data-testid': 'DdlCount-Tables',
            },
          ],
        }}
        validations={{
          title: 'DDL Validation',
          metrics: buildBwcValidationMetrics({
            changesSummary: ddlSummary.changesSummary ?? DEFAULT_CHANGE_SEVERITY_MAP,
            numberOfImpacted: ddlSummary.numberOfImpactedEntities ?? DEFAULT_CHANGE_SEVERITY_MAP,
            impactedEntity: SUMMARY_IMPACTED_ENTITY_TABLES,
          }),
        }}
      />
    </SummarySection>
  )
})

DdlSummary.displayName = 'DdlSummary'
