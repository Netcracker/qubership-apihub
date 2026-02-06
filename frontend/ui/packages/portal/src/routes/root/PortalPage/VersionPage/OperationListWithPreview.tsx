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

import { useNormalizedOperation } from '@apihub/api-hooks/InternalDocuments/useNormalizedOperation'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import type {
  OperationListSubComponentProps,
} from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationWithMetaClickableList'
import {
  OperationWithMetaClickableList,
} from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationWithMetaClickableList'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { RAW_OPERATION_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import {
  checkIfGraphQLOperation,
  type FetchNextOperationList,
  type OperationData,
  type OperationsData,
  type PackageRef,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useSystemInfo } from '@netcracker/qubership-apihub-ui-shared/features/system-info'
import { usePublishedDocumentRaw } from '@netcracker/qubership-apihub-ui-shared/hooks/documents/usePublishedDocumentRaw'
import {
  useOperationsPairStringified,
} from '@netcracker/qubership-apihub-ui-shared/hooks/operations/useOperationsPairAsStrings'
import type { ResizeCallback } from 're-resizable'
import type { FC } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useBackwardLocation } from '../../useBackwardLocation'
import { useSelectedPreviewOperation, useSetSelectedPreviewOperation } from '../SelectedPreviewOperationProvider'
import { usePackageKind } from '../usePackageKind'
import { usePackageParamsWithRef } from '../usePackageParamsWithRef'
import { OperationPreview } from './VersionOperationsSubPage/OperationPreview'
import { getOperationLink } from './useNavigateToOperation'
import { useOperation } from './useOperation'
import { useOperationSearchParams } from './useOperationSearchParams'
import { useOperationViewMode } from './useOperationViewMode'
import { useRawGraphQlCroppedToSingleOperationRawGraphQl } from './useRawGraphQlCroppedToSingleOperationRawGraphQl'

export type OperationListWithPreviewProps = {
  operations: OperationsData
  fetchNextPage?: FetchNextOperationList
  isNextPageFetching?: boolean
  hasNextPage?: boolean
  isListLoading: boolean
  packageKey: Key
  versionKey: Key
  apiType: ApiType
  initialSize: number
  handleResize: ResizeCallback
  maxPreviewWidth: number
  isExpandableItem?: (operation: OperationData) => boolean
  SubComponent?: FC<OperationListSubComponentProps>
}

// High Order Component //
export const OperationListWithPreview: FC<OperationListWithPreviewProps> = memo<OperationListWithPreviewProps>((props) => {
  const {
    packageKey, versionKey,
    apiType, operations, isListLoading,
    fetchNextPage, isNextPageFetching, hasNextPage,
    initialSize, handleResize, maxPreviewWidth,
    isExpandableItem,
    SubComponent,
  } = props

  const operationSearchParams = useOperationSearchParams()
  const [kind] = usePackageKind()
  const { mode, schemaViewMode } = useOperationViewMode()
  const { productionMode } = useSystemInfo()

  const selectedPreviewOperation = useSelectedPreviewOperation()
  const setSelectedPreviewOperation = useSetSelectedPreviewOperation()

  const [operationsPackageKey, operationsVersionsKey] = usePackageParamsWithRef(kind === DASHBOARD_KIND ? selectedPreviewOperation?.packageRef?.key : '')

  const { data: changedOperation, isInitialLoading } = useOperation({
    packageKey: operationsPackageKey,
    versionKey: operationsVersionsKey,
    operationKey: selectedPreviewOperation?.operationKey,
    apiType: apiType as ApiType,
  })

  const isGraphQLOperation = checkIfGraphQLOperation(changedOperation)
  const isRawOperationViewMode = mode === RAW_OPERATION_VIEW_MODE

  const [documentWithChangedGraphQlOperation] = usePublishedDocumentRaw({
    packageKey: packageKey,
    versionKey: versionKey,
    slug: changedOperation?.documentId ?? '',
    enabled: isRawOperationViewMode && !!changedOperation && isGraphQLOperation,
  })

  const { changedOperation: changedOperationContent } = useOperationsPairStringified(
    isGraphQLOperation
      ? { changedOperation: documentWithChangedGraphQlOperation }
      : undefined,
    {
      changedOperation: changedOperation,
      enabled: !isGraphQLOperation && isRawOperationViewMode,
    },
  )

  const graphQlOperationType = useMemo(
    () => (checkIfGraphQLOperation(changedOperation) ? changedOperation.type : undefined),
    [changedOperation],
  )
  const graphQlOperationName = useMemo(
    () => (checkIfGraphQLOperation(changedOperation) ? changedOperation.method : undefined),
    [changedOperation],
  )
  const changedGraphQlOperationContent = useRawGraphQlCroppedToSingleOperationRawGraphQl(changedOperationContent, graphQlOperationType, graphQlOperationName)

  const { data: normalizedChangedOperation, isLoading: isNormalizedChangedOperationLoading } = useNormalizedOperation({
    operation: changedOperation,
    packageId: operationsPackageKey,
    versionId: operationsVersionsKey,
  })

  const onRowClick = useCallback((operationKey: Key, packageRef: PackageRef | undefined) => setSelectedPreviewOperation({
    operationKey,
    packageRef,
  }), [setSelectedPreviewOperation])

  const prepareLinkFn = useCallback((operation: OperationData) => getOperationLink({
    packageKey: packageKey!,
    versionKey: versionKey!,
    kind: kind,
    operationKey: operation.operationKey,
    apiType: operation.apiType,
    packageRef: operation.packageRef,
    ...operationSearchParams,
  }), [kind, operationSearchParams, packageKey, versionKey])

  const location = useBackwardLocation()
  const backwardLocation = useBackwardLocationContext()
  const setBackwardLocation = useSetBackwardLocationContext()
  const onClickLink = (): void => {
    setBackwardLocation({ ...backwardLocation, fromOperation: location })
  }

  return (
    <OperationWithMetaClickableList
      operations={operations}
      prepareLinkFn={prepareLinkFn}
      onRowClick={onRowClick}
      fetchNextPage={fetchNextPage}
      isNextPageFetching={isNextPageFetching}
      hasNextPage={hasNextPage}
      isLoading={isListLoading}
      selectedOperationKey={selectedPreviewOperation?.operationKey}
      initialSize={initialSize}
      handleResize={handleResize}
      maxWidth={maxPreviewWidth}
      onLinkClick={onClickLink}
      isExpandableItem={isExpandableItem}
      SubComponent={SubComponent}
      previewComponent={
        <OperationPreview
          apiType={apiType}
          changedOperation={changedOperation}
          changedOperationContent={changedGraphQlOperationContent || changedOperationContent}
          // Feature "Internal documents"
          normalizedChangedOperation={normalizedChangedOperation}
          // ---
          isLoading={isInitialLoading || isNormalizedChangedOperationLoading}
          mode={mode}
          schemaViewMode={schemaViewMode}
          productionMode={productionMode}
          maxWidthHeaderToolbar={initialSize}
        />
      }
    />
  )
})
