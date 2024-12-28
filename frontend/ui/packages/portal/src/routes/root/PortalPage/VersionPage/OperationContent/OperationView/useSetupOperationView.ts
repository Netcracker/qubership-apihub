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

import { useEffect, useMemo } from 'react'
import type { DiffOperationView, OperationView } from '@netcracker/qubership-apihub-apispec-view'
import type { OperationViewProps } from './OperationView'

// TODO 27.06.24 // Better to use "instanceof" but there is problem with exporting from "apispec-view"
function isDiffOperationView(value: OperationView | DiffOperationView): value is DiffOperationView {
  return 'diffMetaKey' in value && typeof value.diffMetaKey === 'symbol'
}

export function useSetupOperationView(
  operationViewElement: OperationView | DiffOperationView,
  props: OperationViewProps,
): void {
  const {
    searchPhrase,
    filters,
    comparisonMode = true,
    sidebarEnabled,
    schemaViewMode,
    mergedDocument,
  } = props

  const schemaDepth = useMemo(
    () => (comparisonMode ? 0 : undefined),
    [comparisonMode],
  )

  useEffect(() => {
    if (operationViewElement && mergedDocument) {
      operationViewElement.mergedDocument = mergedDocument
    }
  }, [mergedDocument, operationViewElement])

  useEffect(() => {
    if (operationViewElement && filters && isDiffOperationView(operationViewElement)) {
      operationViewElement.filters = filters
    }
  }, [filters, operationViewElement])

  useEffect(() => {
    if (operationViewElement && searchPhrase) {
      operationViewElement.searchPhrase = searchPhrase
    }
  }, [searchPhrase, operationViewElement])

  useEffect(() => {
    if (operationViewElement && schemaDepth) {
      operationViewElement.defaultSchemaDepth = schemaDepth
    }
  }, [operationViewElement, schemaDepth])

  useEffect(() => {
    if (operationViewElement && sidebarEnabled) {
      operationViewElement.layout = sidebarEnabled ? 'sidebar' : 'partial'
    }
  }, [operationViewElement, sidebarEnabled])

  useEffect(() => {
    if (operationViewElement && schemaViewMode) {
      operationViewElement.schemaViewMode = schemaViewMode
    }
  }, [schemaViewMode, operationViewElement])
}
