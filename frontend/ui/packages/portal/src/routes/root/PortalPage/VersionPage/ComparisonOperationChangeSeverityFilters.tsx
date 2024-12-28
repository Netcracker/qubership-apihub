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
import { memo, useEffect, useMemo, useState } from 'react'
import { useComparedOperationsPair } from './ComparedOperationsContext'
import { DEFAULT_CHANGE_SEVERITY_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { ChangeSeverityFilters } from '@netcracker/qubership-apihub-ui-shared/components/ChangeSeverityFilters'
import { useSemiBreakingChanges } from '@apihub/routes/root/PortalPage/VersionPage/useSemiBreakingChanges'
import { getApiDiffResult, handleSemiBreakingChanges } from '@netcracker/qubership-apihub-ui-shared/utils/api-diff-result'
import { GLOBAL_DIFF_META_KEY } from '@netcracker/qubership-apihub-ui-shared/utils/api-diffs'
import { BREAKING_CHANGE_TYPE } from '@netcracker/qubership-apihub-api-processor'
import type { Diff } from '@netcracker/qubership-apihub-api-diff'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import {
  useIsApiDiffResultLoading,
  useSetApiDiffResult,
  useSetIsApiDiffResultLoading,
} from '@apihub/routes/root/ApiDiffResultProvider'
import type { ChangelogAvailable } from '@apihub/routes/root/PortalPage/VersionPage/common-props'

type ChangesSummary = typeof DEFAULT_CHANGE_SEVERITY_MAP

export type ComparisonOperationChangeSeverityFiltersProps = ChangelogAvailable
export const ComparisonOperationChangeSeverityFilters: FC<ComparisonOperationChangeSeverityFiltersProps> = memo<ComparisonOperationChangeSeverityFiltersProps>(props => {
  const { isChangelogAvailable } = props

  const {
    left: originOperation,
    right: changedOperation,
    isLoading: isOperationsLoading,
  } = useComparedOperationsPair()

  const setApiDiffResultContext = useSetApiDiffResult()
  const isApiDiffResultLoading = useIsApiDiffResultLoading()
  const setIsApiDiffResultLoadingContext = useSetIsApiDiffResultLoading()

  const [apiDiffLoading, setApiDiffLoading] = useState<boolean>(true)

  const [changes, setChanges] = useState<ChangesSummary | undefined>(undefined)

  const apiDiffResult = useMemo(() =>
    getApiDiffResult({
      beforeData: originOperation?.data,
      afterData: changedOperation?.data,
      metaKey: GLOBAL_DIFF_META_KEY,
      setApiDiffLoading: setApiDiffLoading,
    }), [changedOperation?.data, originOperation?.data])

  const [semiBreakingChanges, isSemiBreakingChangesLoading, isSuccess] = useSemiBreakingChanges({
    operationKey: changedOperation?.operationKey ?? originOperation?.operationKey,
    comparisonMode: true,
    needToCheckSemiBreaking: !apiDiffLoading && apiDiffResult?.diffs.some(diff => diff.type === BREAKING_CHANGE_TYPE),
    isChangelogAvailable: isChangelogAvailable,
  })

  useEffect(() => {
    setIsApiDiffResultLoadingContext(apiDiffLoading || isSemiBreakingChangesLoading)
  }, [apiDiffLoading, isSemiBreakingChangesLoading, setIsApiDiffResultLoadingContext])

  useEffect(() => {
    if (isOperationsLoading || apiDiffLoading || isSemiBreakingChangesLoading) {
      return
    }
    if (isSuccess && isNotEmpty(semiBreakingChanges) && apiDiffResult) {
      const apiDiffResultWithSemiBraking = handleSemiBreakingChanges(semiBreakingChanges, apiDiffResult)
      setApiDiffResultContext(apiDiffResultWithSemiBraking)
      setChanges(apiDiffResultWithSemiBraking?.diffs.reduce(changesSummaryReducer, { ...DEFAULT_CHANGE_SEVERITY_MAP }))
    } else {
      setApiDiffResultContext(apiDiffResult)
      setChanges(apiDiffResult?.diffs.reduce(changesSummaryReducer, { ...DEFAULT_CHANGE_SEVERITY_MAP }))
    }
  }, [apiDiffLoading, apiDiffResult, isOperationsLoading, isSemiBreakingChangesLoading, isSuccess, semiBreakingChanges, setApiDiffResultContext, setChanges])

  //todo return after resolve
  /*const [filters, setFilters] = useSeverityFiltersSearchParam()

  const handleFilters = useCallback((selectedFilters: ChangeSeverity[]): void => {
    setFilters(selectedFilters.toString())
  }, [setFilters])*/

  if (isOperationsLoading || isApiDiffResultLoading || isSemiBreakingChangesLoading) {
    return null
  }

  return (
    <ChangeSeverityFilters
      changes={changes}
      filters={[]}
    />
  )
})

function changesSummaryReducer(accumulator: ChangesSummary, { type }: Diff): ChangesSummary {
  accumulator[type]++
  return accumulator
}
