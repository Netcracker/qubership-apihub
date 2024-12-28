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

import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { useOperation } from './useOperation'
import { getOperationLink } from './useNavigateToOperation'
import { useOperationSearchParams } from './useOperationSearchParams'
import { usePackageKind } from '../usePackageKind'
import { useSelectedPreviewOperation, useSetSelectedPreviewOperation } from '../SelectedPreviewOperationProvider'
import { usePackageParamsWithRef } from '../usePackageParamsWithRef'
import { OperationPreview } from './VersionOperationsSubPage/OperationPreview'
import { useOperationViewMode } from './useOperationViewMode'
import type { ResizeCallback } from 're-resizable'
import { useBackwardLocation } from '../../useBackwardLocation'
import type {
  FetchNextOperationList,
  OperationData,
  OperationsData,
  PackageRef,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type {
  OperationListSubComponentProps,
} from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationWithMetaClickableList'
import {
  OperationWithMetaClickableList,
} from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationWithMetaClickableList'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useOperationsPairAsStrings } from '@netcracker/qubership-apihub-ui-shared/hooks/operations/useOperationsPairAsStrings'
import { useBackwardLocationContext, useSetBackwardLocationContext } from '@apihub/routes/BackwardLocationProvider'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { useSystemInfo } from '@netcracker/qubership-apihub-ui-shared/features/system-info'

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

  const [changedOperationContent] = useOperationsPairAsStrings(changedOperation)

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
          changedOperation={changedOperation}
          changedOperationContent={changedOperationContent}
          apiType={apiType}
          isLoading={isInitialLoading}
          mode={mode}
          schemaViewMode={schemaViewMode}
          productionMode={productionMode}
        />
      }
    />
  )
})
