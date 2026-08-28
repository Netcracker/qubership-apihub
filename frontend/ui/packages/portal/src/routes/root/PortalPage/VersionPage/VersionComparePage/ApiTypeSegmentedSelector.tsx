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
import { memo, useMemo } from 'react'

import { Toggler } from '@netcracker/qubership-apihub-ui-shared/components/Toggler'
import { API_TYPE_TITLE_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { CONTRACT_TYPE_DDL, CONTRACT_TYPE_TITLE_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { getDashboardComparisonApiTypes } from '@netcracker/qubership-apihub-ui-shared/entities/contracts-changes-summary'
import {
  isDashboardComparisonSummary,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'

import { useChangesSummaryFromContext } from '../ChangesSummaryProvider'
import { useApiTypeSearchParam } from '../useApiTypeSearchParam'
import {
  COMPARE_API_TYPE_ALL,
  type CompareApiTypeFilterOption,
} from './compareApiTypeFilter'

export const ApiTypeSegmentedSelector: FC = memo(() => {
  const { apiType, setApiTypeSearchParam } = useApiTypeSearchParam()
  const changesSummary = useChangesSummaryFromContext()

  const selectorOptions = useMemo((): readonly CompareApiTypeFilterOption[] => {
    if (!changesSummary || !isDashboardComparisonSummary(changesSummary)) {
      return [COMPARE_API_TYPE_ALL]
    }

    return [COMPARE_API_TYPE_ALL, ...getDashboardComparisonApiTypes(changesSummary)]
  }, [changesSummary])

  return (
    <Toggler<CompareApiTypeFilterOption>
      mode={apiType as CompareApiTypeFilterOption}
      modes={selectorOptions}
      onChange={setApiTypeSearchParam}
      modeToText={OPTION_DISPLAYS}
    />
  )
})

ApiTypeSegmentedSelector.displayName = 'ApiTypeSegmentedSelector'

const OPTION_DISPLAYS: Record<string, string> = {
  ...API_TYPE_TITLE_MAP,
  [CONTRACT_TYPE_DDL]: CONTRACT_TYPE_TITLE_MAP[CONTRACT_TYPE_DDL],
  [COMPARE_API_TYPE_ALL]: 'All',
}
