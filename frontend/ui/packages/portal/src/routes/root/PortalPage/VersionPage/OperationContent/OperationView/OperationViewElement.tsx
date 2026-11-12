import '@netcracker/qubership-apihub-apispec-view'
import type { OperationView } from '@netcracker/qubership-apihub-apispec-view'

export type OperationViewElementProps = {
  router: 'history' | 'memory' | 'hash' | 'static'
  layout: 'sidebar' | 'stacked' | 'partial'
  hideTryIt: boolean
  hideExport: boolean
  noHeading: boolean
  selectedNodeUri: string
  searchPhrase: string
  schemaViewMode: string
  defaultSchemaDepth: number
  hideExamples: boolean
  mergedDocument: unknown
}

export function createOperationViewElement(props: OperationViewElementProps): OperationView {
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
  } = props

  const component = document.createElement('operation-view')

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

  return component
}
