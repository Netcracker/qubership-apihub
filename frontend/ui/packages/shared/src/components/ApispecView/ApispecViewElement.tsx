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
