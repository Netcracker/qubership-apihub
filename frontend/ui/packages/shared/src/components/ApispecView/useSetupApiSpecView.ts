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
