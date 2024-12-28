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
import type { DiffOperationView } from '@netcracker/qubership-apihub-apispec-view'
import type { OperationViewElementProps } from '../OperationView/OperationViewElement'
import type { ChangeSeverity } from '@netcracker/qubership-apihub-ui-shared/entities/change-severities'

export type DiffOperationViewElementProps = OperationViewElementProps & {
  filters: ChangeSeverity[]
  diffMetaKey: symbol
}

export function createDiffOperationViewElement(props: DiffOperationViewElementProps): DiffOperationView {
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
    diffMetaKey,
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
  component.diffMetaKey = diffMetaKey

  return component
}
