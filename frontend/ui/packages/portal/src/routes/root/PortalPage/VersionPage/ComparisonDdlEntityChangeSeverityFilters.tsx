import { useComparedDdlContracts } from '@portal/api-hooks/InternalDocuments/useComparedDdlContracts'
import {
  useIsApiDiffResultLoading,
  useSetApiDiffResult,
  useSetHasComparisonInternalDocument,
  useSetIsApiDiffResultLoading,
} from '@portal/routes/root/ApiDiffResultProvider'
import type { Diff } from '@netcracker/qubership-apihub-api-diff'
import { ChangeSeverityFilters } from '@netcracker/qubership-apihub-ui-shared/components/ChangeSeverityFilters'
import type { ChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import type { FC } from 'react'
import { memo, useEffect, useMemo, useState } from 'react'
import { useComparedDdlContractsPair } from './ComparedDdlContractsContext'
import type { InternalDocumentOptions } from './ComparisonToolbar'

export type ComparisonDdlEntityChangeSeverityFiltersProps = {
  internalDocumentOptions?: InternalDocumentOptions
  ddlEntityChangeSummary?: ChangesSummary
}

export const ComparisonDdlEntityChangeSeverityFilters: FC<ComparisonDdlEntityChangeSeverityFiltersProps> = memo<
  ComparisonDdlEntityChangeSeverityFiltersProps
>((props) => {
  const { internalDocumentOptions, ddlEntityChangeSummary } = props
  const comparisonAlreadyDone = !!internalDocumentOptions

  const {
    previousDdlContract: originDdlContract,
    currentDdlContract: changedDdlContract,
    isLoading: isDdlContractsLoading,
  } = useComparedDdlContractsPair()

  const setApiDiffResultContext = useSetApiDiffResult()
  const isApiDiffResultLoading = useIsApiDiffResultLoading()
  const setIsApiDiffResultLoadingContext = useSetIsApiDiffResultLoading()
  const setHasComparisonInternalDocumentContext = useSetHasComparisonInternalDocument()

  const [changes, setChanges] = useState<ChangesSummary | undefined>(undefined)

  const {
    data: comparisonInternalDocument,
    isLoading: apiDiffLoading,
    hasInternalDocument: hasComparisonInternalDocument,
  } = useComparedDdlContracts({
    previousDdlContract: originDdlContract,
    currentDdlContract: changedDdlContract,
    ddlChanges: internalDocumentOptions?.ddlChanges,
    currentPackageId: internalDocumentOptions?.currentPackageId,
    currentVersionId: internalDocumentOptions?.currentVersionId,
    previousPackageId: internalDocumentOptions?.previousPackageId,
    previousVersionId: internalDocumentOptions?.previousVersionId,
  })

  useEffect(() => {
    if (!comparisonAlreadyDone || !ddlEntityChangeSummary) {
      return
    }
    setChanges(ddlEntityChangeSummary)
  }, [comparisonAlreadyDone, ddlEntityChangeSummary])

  const apiDiffResult = useMemo(() => {
    if (!comparisonAlreadyDone) {
      return undefined
    }

    return { merged: comparisonInternalDocument, diffs: [] as Diff[] }
  }, [comparisonAlreadyDone, comparisonInternalDocument])

  useEffect(() => {
    setIsApiDiffResultLoadingContext(internalDocumentOptions ? apiDiffLoading : false)
  }, [apiDiffLoading, internalDocumentOptions, setIsApiDiffResultLoadingContext])

  useEffect(
    () => {
      if (isDdlContractsLoading || apiDiffLoading) {
        return
      }
      setApiDiffResultContext(apiDiffResult)
      setHasComparisonInternalDocumentContext(hasComparisonInternalDocument)
      if (!comparisonAlreadyDone && ddlEntityChangeSummary) {
        setChanges(ddlEntityChangeSummary)
      }
    },
    [
      apiDiffLoading,
      apiDiffResult,
      comparisonAlreadyDone,
      ddlEntityChangeSummary,
      hasComparisonInternalDocument,
      isDdlContractsLoading,
      setApiDiffResultContext,
      setHasComparisonInternalDocumentContext,
    ],
  )

  if (isDdlContractsLoading || isApiDiffResultLoading) {
    return null
  }

  return (
    <ChangeSeverityFilters
      changes={changes}
      filters={[]}
    />
  )
})

ComparisonDdlEntityChangeSeverityFilters.displayName = 'ComparisonDdlEntityChangeSeverityFilters'
