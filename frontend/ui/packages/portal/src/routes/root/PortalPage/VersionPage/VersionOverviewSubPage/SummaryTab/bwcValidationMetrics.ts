import { Box } from '@mui/material'
import { createElement } from 'react'

import { Changes } from '@netcracker/qubership-apihub-ui-shared/components/Changes'
import { CATEGORY_OPERATION } from '@netcracker/qubership-apihub-ui-shared/components/ChangesTooltip'
import {
  BREAKING_CHANGE_SEVERITY,
  type ChangesSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'

import { type SummaryImpactedEntity } from './entities'
import type { SummaryMetric } from './SummaryPanel'

type BwcValidationMetricsOptions = Readonly<{
  changesSummary: ChangesSummary
  numberOfImpacted: ChangesSummary
  impactedEntity: SummaryImpactedEntity
}>

export function buildBwcValidationMetrics({
  changesSummary,
  numberOfImpacted,
  impactedEntity,
}: BwcValidationMetricsOptions): ReadonlyArray<SummaryMetric> {
  return [
    {
      label: 'Number of BWC errors',
      value: changesSummary[BREAKING_CHANGE_SEVERITY],
      'data-testid': 'NumberOfBwcErrorsTypography',
    },
    {
      label: 'Number of changes',
      value: createElement(
        Box,
        { display: 'flex', alignItems: 'center' },
        createElement(Changes, { value: changesSummary, mode: 'compact', zeroView: true }),
      ),
    },
    {
      label: `Number of affected ${impactedEntity}`,
      value: createElement(
        Box,
        { display: 'flex', alignItems: 'center' },
        createElement(Changes, {
          value: numberOfImpacted,
          mode: 'compact',
          category: CATEGORY_OPERATION,
          zeroView: true,
        }),
      ),
    },
  ]
}
