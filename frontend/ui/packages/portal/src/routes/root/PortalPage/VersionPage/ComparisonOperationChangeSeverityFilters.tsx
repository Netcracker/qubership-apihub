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
import { DIFF_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import { ChangeSeverityFilters } from '@netcracker/qubership-apihub-ui-shared/components/ChangeSeverityFilters'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { DEFAULT_CHANGE_SEVERITY_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import { getApiDiffResult } from '@netcracker/qubership-apihub-ui-shared/utils/api-diff-result'
import type { FC } from 'react'
import { memo, useEffect, useMemo, useState } from 'react'
import { useComparedOperationsPair } from './ComparedOperationsContext'
import type { InternalDocumentOptions } from './ComparisonToolbar'
import { useOperationChangesSummary } from './useOperationChangesSummary'

type ChangesSummary = typeof DEFAULT_CHANGE_SEVERITY_MAP

export type ComparisonOperationChangeSeverityFiltersProps = {
  internalDocumentOptions?: InternalDocumentOptions
  apiType: ApiType
}

export const ComparisonOperationChangeSeverityFilters: FC<ComparisonOperationChangeSeverityFiltersProps> = memo<ComparisonOperationChangeSeverityFiltersProps>(props => {
  const { internalDocumentOptions, apiType } = props
  const comparisonAlreadyDone = !!internalDocumentOptions

  const {
    previousOperation: originOperation,
    currentOperation: changedOperation,
    isLoading: isOperationsLoading,
  } = useComparedOperationsPair()

  const setApiDiffResultContext = useSetApiDiffResult()
  const isApiDiffResultLoading = useIsApiDiffResultLoading()
  const setIsApiDiffResultLoadingContext = useSetIsApiDiffResultLoading()

  const [apiDiffExecuting, setApiDiffExecuting] = useState(false)
  const [changes, setChanges] = useState<ChangesSummary | undefined>(undefined)

  const { data: comparisonInternalDocument, isLoading: apiDiffLoading } = useComparedOperations({
    previousOperation: originOperation,
    currentOperation: changedOperation,
    versionChanges: internalDocumentOptions?.versionChanges,
    currentPackageId: internalDocumentOptions?.currentPackageId,
    currentVersionId: internalDocumentOptions?.currentVersionId,
    previousPackageId: internalDocumentOptions?.previousPackageId,
    previousVersionId: internalDocumentOptions?.previousVersionId,
  })

  const { data: operationChangesSummary, isLoading: loadingOperationChangesSummary } = useOperationChangesSummary({
    packageId: internalDocumentOptions?.currentPackageId ?? '',
    versionId: internalDocumentOptions?.currentVersionId ?? '',
    previousPackageId: internalDocumentOptions?.previousPackageId ?? '',
    previousVersionId: internalDocumentOptions?.previousVersionId ?? '',
    apiType: apiType,
    operationId: changedOperation?.operationKey ?? originOperation?.operationKey ?? '',
    enabled: comparisonAlreadyDone,
  })

  useEffect(() => {
    if (!loadingOperationChangesSummary) {
      setChanges(operationChangesSummary)
    }
  }, [operationChangesSummary, loadingOperationChangesSummary])

  const apiDiffResult = useMemo(() => {
    // prefix groups operations OR arbitary operations comparison
    if (!comparisonAlreadyDone) {
      return getApiDiffResult({
        beforeData: originOperation?.data,
        afterData: changedOperation?.data,
        metaKey: DIFF_META_KEY,
        setApiDiffLoading: setApiDiffExecuting,
      })
    }

    return { merged: comparisonInternalDocument, diffs: [] as Diff[] }
  }, [changedOperation?.data, comparisonAlreadyDone, comparisonInternalDocument, originOperation?.data])

  useEffect(() => {
    setIsApiDiffResultLoadingContext(internalDocumentOptions ? apiDiffLoading : apiDiffExecuting)
  }, [apiDiffLoading, apiDiffExecuting, setIsApiDiffResultLoadingContext, internalDocumentOptions])

  useEffect(() => {
    if (isOperationsLoading || apiDiffLoading || apiDiffExecuting) {
      return
    }
    setApiDiffResultContext(apiDiffResult)
    if (!comparisonAlreadyDone) {
      setChanges(apiDiffResult?.diffs.reduce(changesSummaryReducer, { ...DEFAULT_CHANGE_SEVERITY_MAP }))
    }
  }, [apiDiffLoading, apiDiffResult, apiDiffExecuting, isOperationsLoading, setApiDiffResultContext, setChanges, internalDocumentOptions, comparisonAlreadyDone])

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
