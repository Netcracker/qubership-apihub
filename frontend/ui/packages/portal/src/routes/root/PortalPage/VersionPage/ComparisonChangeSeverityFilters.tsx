import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useOrderedComparisonFiltersSummary } from './useOrderedComparisonFiltersSummary'
import type { ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { ChangeSeverityFilters } from '@netcracker/qubership-apihub-ui-shared/components/ChangeSeverityFilters'
import type { ComparisonChangeSeverityFiltersProps } from '@portal/routes/root/PortalPage/VersionPage/common-props'
import { CATEGORY_PACKAGE } from '@netcracker/qubership-apihub-ui-shared/components/ChangesTooltip'

export const ComparisonChangeSeverityFilters: FC<ComparisonChangeSeverityFiltersProps> =
  memo<ComparisonChangeSeverityFiltersProps>(({ category, apiType }) => {
    const changesSummaryFromContext = useOrderedComparisonFiltersSummary({
      isDashboardsComparison: category === CATEGORY_PACKAGE,
      apiType: apiType,
    })

    const changes = useMemo(
      () => changesSummaryFromContext ?? undefined,
      [changesSummaryFromContext],
    )

    const [filters, setFilters] = useSeverityFiltersSearchParam()

    const handleFilters = useCallback((selectedFilters: ChangeSeverity[]): void => {
      setFilters(selectedFilters.toString())
    }, [setFilters])

    return (
      <ChangeSeverityFilters
        changes={changes}
        filters={filters}
        handleFilters={handleFilters}
        category={category}
      />
    )
  })
