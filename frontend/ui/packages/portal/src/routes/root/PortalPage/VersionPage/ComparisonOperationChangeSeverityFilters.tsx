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

import { useComparedOperations } from '@apihub/api-hooks/InternalDocuments/useComparedOperations'
import {
  useIsApiDiffResultLoading,
  useSetApiDiffResult,
  useSetIsApiDiffResultLoading,
} from '@apihub/routes/root/ApiDiffResultProvider'
import type { Diff } from '@netcracker/qubership-apihub-api-diff'
import { DIFFS_AGGREGATED_META_KEY, isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from '@netcracker/qubership-apihub-api-diff'
import { ChangeSeverityFilters } from '@netcracker/qubership-apihub-ui-shared/components/ChangeSeverityFilters'
import { DEFAULT_CHANGE_SEVERITY_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { isObject } from '@netcracker/qubership-apihub-ui-shared/utils/objects'
import type { FC } from 'react'
import { memo, useEffect, useMemo, useState } from 'react'
import { useComparedOperationsPair } from './ComparedOperationsContext'
import type { InternalDocumentOptions } from './ComparisonToolbar'

type ChangesSummary = typeof DEFAULT_CHANGE_SEVERITY_MAP

export type ComparisonOperationChangeSeverityFiltersProps = {
  internalDocumentOptions?: InternalDocumentOptions
}

export const ComparisonOperationChangeSeverityFilters: FC<ComparisonOperationChangeSeverityFiltersProps> = memo<ComparisonOperationChangeSeverityFiltersProps>(props => {
  const { internalDocumentOptions } = props

  const {
    previousOperation: originOperation,
    currentOperation: changedOperation,
    isLoading: isOperationsLoading,
  } = useComparedOperationsPair()

  const setApiDiffResultContext = useSetApiDiffResult()
  const isApiDiffResultLoading = useIsApiDiffResultLoading()
  const setIsApiDiffResultLoadingContext = useSetIsApiDiffResultLoading()

  const [changes, setChanges] = useState<ChangesSummary | undefined>(undefined)

  const { data: comparisonInternalDocument, isLoading: apiDiffLoading } = useComparedOperations({
    previousOperation: originOperation,
    currentOperation: changedOperation,
    versionChanges: internalDocumentOptions?.versionChanges,
    currentPackageId: internalDocumentOptions?.currentPackageId,
    currentVersionId: internalDocumentOptions?.currentVersionId,
  })

  const apiDiffResult = useMemo(() => {
    let diffs: Diff[] = []
    const maybeAggregatedDiffs =
      isObject(comparisonInternalDocument) && DIFFS_AGGREGATED_META_KEY in comparisonInternalDocument
        ? comparisonInternalDocument[DIFFS_AGGREGATED_META_KEY]
        : undefined
    if (maybeAggregatedDiffs && maybeAggregatedDiffs instanceof Set) {
      const maybeAggregatedDiffsArray = Array.from(maybeAggregatedDiffs)
      const aggregatedDiffsTypedArray: Diff[] = maybeAggregatedDiffsArray.filter(
        (maybeDiff): maybeDiff is Diff => (
          isDiffAdd(maybeDiff) ||
          isDiffRemove(maybeDiff) ||
          isDiffReplace(maybeDiff) ||
          isDiffRename(maybeDiff)
        ),
      )
      diffs = aggregatedDiffsTypedArray
    }
    return {
      merged: comparisonInternalDocument,
      diffs: diffs,
    }
  }, [comparisonInternalDocument])

  useEffect(() => {
    setIsApiDiffResultLoadingContext(apiDiffLoading)
  }, [apiDiffLoading, setIsApiDiffResultLoadingContext])

  useEffect(() => {
    if (isOperationsLoading || apiDiffLoading) {
      return
    }
    setApiDiffResultContext(apiDiffResult)
    setChanges(apiDiffResult?.diffs.reduce(changesSummaryReducer, { ...DEFAULT_CHANGE_SEVERITY_MAP }))
  }, [apiDiffLoading, apiDiffResult, isOperationsLoading, setApiDiffResultContext, setChanges])

  //todo return after resolve
  /*const [filters, setFilters] = useSeverityFiltersSearchParam()

  const handleFilters = useCallback((selectedFilters: ChangeSeverity[]): void => {
    setFilters(selectedFilters.toString())
  }, [setFilters])*/

  if (isOperationsLoading || isApiDiffResultLoading) {
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
