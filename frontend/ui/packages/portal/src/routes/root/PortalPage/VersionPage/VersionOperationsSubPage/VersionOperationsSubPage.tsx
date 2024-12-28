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

import type { FC, MutableRefObject } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExportOperationsMenu } from '../ExportOperationsMenu'
import { useParams } from 'react-router-dom'
import { useApiKindSearchFilter } from '../useApiKindSearchFilters'
import { useTagSearchFilter } from '../useTagSearchFilter'
import { useStatusSearchFilter } from '../useStatusSearchFIlter'
import { useRefSearchParam } from '../../useRefSearchParam'
import { useOperationGroupSearchFilter } from '../useOperationGroupSearchFilter'
import { useOperations } from '../useOperations'
import { OpenApiTable } from '../OpenApiViewer/OpenApiTable'
import { OperationListWithPreview } from '../OperationListWithPreview'
import { useSetSelectedPreviewOperation } from '../../SelectedPreviewOperationProvider'
import type { NumberSize, ResizeDirection } from 're-resizable'
import { VersionOperationsPanel } from '../VersionOperationsPanel'
import { OperationsNavigation } from '../OperationsNavigation'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { isEmptyTag } from '@netcracker/qubership-apihub-ui-shared/utils/tags'
import { isEmpty, isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { NAVIGATION_MAX_WIDTH } from '@netcracker/qubership-apihub-ui-shared/utils/page-layouts'
import type { Key } from '@apihub/entities/keys'
import { usePortalPageSettingsContext } from '@apihub/routes/PortalPageSettingsProvider'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { useApiAudienceSearchFilter } from '../useApiAudienceSearchFilters'

// High Order Component //
export const VersionOperationsSubPage: FC = memo(() => {
  const [searchValue, setSearchValue] = useState('')
  const { packageId, versionId, apiType = DEFAULT_API_TYPE } = useParams<{
    packageId: Key
    versionId: Key
    apiType: ApiType
  }>()
  const bodyRef: MutableRefObject<HTMLDivElement | null> = useRef(null)

  const [apiKindFilter] = useApiKindSearchFilter()
  const [apiAudienceFilter] = useApiAudienceSearchFilter()
  const [selectedTag] = useTagSearchFilter()
  const [statusFilter] = useStatusSearchFilter()
  const [refKey] = useRefSearchParam()

  const emptyTag = isEmptyTag(selectedTag)
  const [operationGroup] = useOperationGroupSearchFilter()
  const setPreviewOperation = useSetSelectedPreviewOperation()

  const [operations, isLoading, fetchNextPage, isFetchingNextPage, hasNextPage] = useOperations({
    packageKey: packageId,
    versionKey: versionId,
    kind: apiKindFilter,
    apiAudience: apiAudienceFilter,
    deprecated: statusFilter,
    tag: selectedTag,
    textFilter: searchValue,
    apiType: apiType,
    groupName: operationGroup,
    refPackageKey: refKey,
    page: 1,
    limit: 100,
  })

  useEffect(() => {
    isNotEmpty(operations)
      ? setPreviewOperation(operations[0])
      : setPreviewOperation(undefined)
  }, [operations, setPreviewOperation])

  const {
    previewSize,
    togglePreviewSize,
    hideFiltersPanel,
    toggleHideFiltersPanel,
    toggleOperationsViewMode,
    operationsViewMode,
  } = usePortalPageSettingsContext()

  const onResize = useCallback(
    (_: MouseEvent | TouchEvent, __: ResizeDirection, ___: HTMLElement, delta: NumberSize) => {
      togglePreviewSize(previewSize + delta.width)
    }, [previewSize, togglePreviewSize])

  const maxPreviewWidth = useMemo(() => {
    if (bodyRef.current?.clientWidth) {
      return bodyRef.current.clientWidth - SUBPAGE_MARGIN
    }
    return NAVIGATION_MAX_WIDTH
    // We need to reset maxPreviewWidth when body width changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyRef.current?.clientWidth])

  return (
    <VersionOperationsPanel
      onContextSearch={setSearchValue}
      title={VERSION_OPERATIONS_TITLE}
      bodyRef={bodyRef}
      hideFiltersPanel={hideFiltersPanel}
      toggleHideFiltersPanel={toggleHideFiltersPanel}
      operationsViewMode={operationsViewMode}
      toggleOperationsViewMode={toggleOperationsViewMode}
      table={<OpenApiTable
        value={operations}
        fetchNextPage={fetchNextPage}
        isNextPageFetching={isFetchingNextPage}
        hasNextPage={hasNextPage}
        isLoading={isLoading}
        apiType={apiType}
        textFilter={searchValue}
      />}
      list={<OperationListWithPreview
        operations={operations}
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isListLoading={isLoading}
        isNextPageFetching={isFetchingNextPage}
        packageKey={packageId!}
        versionKey={versionId!}
        apiType={apiType}
        initialSize={previewSize}
        handleResize={onResize}
        maxPreviewWidth={maxPreviewWidth}
      />}
      filters={<OperationsNavigation />}
      exportButton={
        <ExportOperationsMenu
          disabled={isEmpty(operations)}
          textFilter={searchValue}
          kind={apiKindFilter}
          apiAudience={apiAudienceFilter}
          tag={selectedTag}
          group={operationGroup}
          refPackageId={refKey}
          emptyTag={emptyTag}
        />}
      testId="OperationsTab"
    />
  )
})

const VERSION_OPERATIONS_TITLE = 'API Operations'

const SUBPAGE_MARGIN = 24
