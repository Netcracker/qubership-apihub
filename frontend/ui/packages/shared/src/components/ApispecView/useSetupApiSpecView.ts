import { useEffect } from 'react'
import type { ApispecView } from '@netcracker/qubership-apihub-apispec-view'
import type { ApispecViewProps } from './ApispecView'

export function useSetupApiSpecView(operationViewElement: ApispecView, props: ApispecViewProps): void {
  const {
    apiDescriptionDocument,
    hideTryIt,
    sidebarEnabled,
    selectedUri,
    searchPhrase,
    schemaViewMode,
    proxyServer,
  } = props

  useEffect(() => {
    if (operationViewElement && apiDescriptionDocument) {
      operationViewElement.apiDescriptionDocument = apiDescriptionDocument
    }
  }, [apiDescriptionDocument, operationViewElement])

  useEffect(() => {
    if (operationViewElement && hideTryIt !== undefined) {
      operationViewElement.hideTryIt = hideTryIt
    }
  }, [hideTryIt, operationViewElement])

  useEffect(() => {
    if (operationViewElement && sidebarEnabled !== undefined) {
      operationViewElement.layout = sidebarEnabled ? 'sidebar' : 'partial'
    }
  }, [sidebarEnabled, operationViewElement])

  useEffect(() => {
    if (operationViewElement && selectedUri) {
      operationViewElement.selectedNodeUri = selectedUri
    }
  }, [selectedUri, operationViewElement])

  useEffect(() => {
    if (operationViewElement && searchPhrase) {
      operationViewElement.searchPhrase = searchPhrase
    }
  }, [searchPhrase, operationViewElement])

  useEffect(() => {
    if (operationViewElement && schemaViewMode) {
      operationViewElement.schemaViewMode = schemaViewMode
    }
  }, [schemaViewMode, operationViewElement])

  useEffect(() => {
    if (operationViewElement && proxyServer) {
      operationViewElement.proxyServer = JSON.stringify(proxyServer)
    }
  }, [proxyServer, operationViewElement])
}
