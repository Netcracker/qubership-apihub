/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useOrderedComparisonFiltersSummary } from './useOrderedComparisonFiltersSummary'
import type { ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { ChangeSeverityFilters } from '@netcracker/qubership-apihub-ui-shared/components/ChangeSeverityFilters'
import type { ComparisonChangeSeverityFiltersProps } from '@apihub/routes/root/PortalPage/VersionPage/common-props'
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
