import type { DiffMetaKeys } from '@portal/entities/diff-meta-keys'
import '@netcracker/qubership-apihub-apispec-view'
import type { DiffOperationView } from '@netcracker/qubership-apihub-apispec-view'
import type { ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'
import type { OperationViewElementProps } from '../OperationView/OperationViewElement'

export type DiffOperationViewElementProps = OperationViewElementProps & {
  filters: ChangeSeverity[]
  diffMetaKeys: DiffMetaKeys
}

export function createDiffOperationViewElement(
  props: DiffOperationViewElementProps,
): DiffOperationView {
  const {
    searchPhrase,
    schemaViewMode,
    hideTryIt,
    noHeading,
    hideExamples,
    selectedNodeUri,
    layout,
    router,
    hideExport,
    defaultSchemaDepth,
    mergedDocument,
    // diffs specific
    filters,
    diffMetaKeys,
  } = props

  const component = document.createElement('diff-operation-view')

  component.searchPhrase = searchPhrase
  component.schemaViewMode = schemaViewMode
  component.hideTryIt = hideTryIt
  component.noHeading = noHeading
  component.hideExamples = hideExamples
  component.selectedNodeUri = selectedNodeUri
  component.defaultSchemaDepth = defaultSchemaDepth
  component.layout = layout
  component.router = router
  component.hideExport = hideExport
  component.mergedDocument = mergedDocument
  // diffs specific
  component.filters = filters
  component.diffsMetaKey = diffMetaKeys.diffsMetaKey
  component.aggregatedDiffsMetaKey = diffMetaKeys.aggregatedDiffsMetaKey

  return component
}
