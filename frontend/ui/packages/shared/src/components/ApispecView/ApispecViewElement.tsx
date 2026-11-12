import '@netcracker/qubership-apihub-apispec-view'
import type { ApispecView } from '@netcracker/qubership-apihub-apispec-view'

export type ApispecViewElementProps = Partial<{
  apiDescriptionDocument: string
  router: 'history' | 'memory' | 'hash' | 'static'
  layout: 'sidebar' | 'stacked' | 'partial'
  hideTryIt: boolean
  hideExport: boolean
  selectedNodeUri: string
  searchPhrase: string
  schemaViewMode: string
  proxyServer: string
}>

export function createApiSpecViewElement(props: ApispecViewElementProps): ApispecView {
  const {
    apiDescriptionDocument,
    router,
    layout,
    hideTryIt,
    selectedNodeUri,
    searchPhrase,
    schemaViewMode,
    proxyServer,
  } = props

  const component = document.createElement('apispec-view')

  apiDescriptionDocument && (component.apiDescriptionDocument = apiDescriptionDocument)
  router && (component.router = router)
  layout && (component.layout = layout)
  hideTryIt && (component.hideTryIt = hideTryIt)
  selectedNodeUri && (component.selectedNodeUri = selectedNodeUri)
  searchPhrase && (component.searchPhrase = searchPhrase)
  schemaViewMode && (component.schemaViewMode = schemaViewMode)
  proxyServer && (component.proxyServer = proxyServer)

  return component
}
