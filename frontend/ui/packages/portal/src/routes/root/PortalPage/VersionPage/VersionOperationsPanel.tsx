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

import type { FC, MutableRefObject, ReactNode } from 'react'
import { memo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { usePackageVersionApiTypes } from './usePackageVersionApiTypes'
import { useFullMainVersion } from '../FullMainVersionProvider'
import { usePackage } from '../../usePackage'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import { useSetSelectedPreviewOperation } from '../SelectedPreviewOperationProvider'
import { useSetPathParam } from './useSetPathParam'
import { useCheckOperationFiltersApplied } from './useCheckOperationFiltersApplied'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { RichFiltersLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/RichFiltersLayout'
import { PageTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/PageTitle'
import { isApiTypeSelectorShown } from '@apihub/utils/operation-types'
import { SegmentItemIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SegmentItemIcon'
import { ListBox } from '@netcracker/qubership-apihub-ui-shared/components/Panels/ListBox'
import { useOperationsView } from './useOperationsView'
import type { OperationsViewMode } from '@netcracker/qubership-apihub-ui-shared/types/views'
import { DETAILED_OPERATIONS_VIEW_MODE, LIST_OPERATIONS_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/types/views'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type VersionOperationsProps = {
  title: string
  onContextSearch: (value: string) => void
  bodyRef: MutableRefObject<HTMLDivElement | null>
  table: ReactNode
  list: ReactNode
  filters: ReactNode
  exportButton: ReactNode
  operationsViewMode: OperationsViewMode
  hideFiltersPanel: boolean
  toggleHideFiltersPanel: (value: boolean) => void
  toggleOperationsViewMode: (value: string) => void
} & TestableProps

// High Order Component //
export const VersionOperationsPanel: FC<VersionOperationsProps> = memo<VersionOperationsProps>(({
  title,
  onContextSearch,
  bodyRef,
  table,
  list,
  filters,
  exportButton,
  testId,
  operationsViewMode,
  toggleOperationsViewMode,
  toggleHideFiltersPanel,
  hideFiltersPanel,
}) => {
  const { apiType = DEFAULT_API_TYPE } = useParams<{ apiType: ApiType }>()
  const [packageObject] = usePackage({ showParents: true })
  const setPathParam = useSetPathParam()
  const setPreviewOperation = useSetSelectedPreviewOperation()
  const fullMainVersion = useFullMainVersion()

  const isDashboard = packageObject?.kind === DASHBOARD_KIND
  const showFilterBadge = useCheckOperationFiltersApplied(isDashboard)

  const { apiTypes } = usePackageVersionApiTypes(packageObject?.key ?? '', fullMainVersion!)

  const [operationsView, setOperationsView] = useOperationsView(operationsViewMode)
  const onOperationsViewChange = useCallback((value: OperationsViewMode | undefined) => {
    if (value) {
      setOperationsView(value)
      toggleOperationsViewMode?.(value)
    }
  }, [setOperationsView, toggleOperationsViewMode])

  const onApiTypeChange = useCallback((apiType: ApiType) => {
    setPreviewOperation?.(undefined)
    setPathParam?.(apiType)
  }, [setPathParam, setPreviewOperation])

  return (
    <RichFiltersLayout
      title={<PageTitle
        apiType={apiType}
        title={title}
        withApiSelector={isApiTypeSelectorShown(apiTypes)}
        onApiTypeChange={onApiTypeChange}
      />}
      searchPlaceholder="Search Operations"
      setSearchValue={onContextSearch}
      viewMode={operationsView}
      viewOptions={VIEW_OPTIONS}
      onOperationsViewChange={onOperationsViewChange}
      exportButton={exportButton}
      filtersApplied={showFilterBadge}
      hideFiltersPanel={hideFiltersPanel}
      filters={filters}
      onClickFilterButton={toggleHideFiltersPanel}
      bodyRef={bodyRef}
      body={operationsView === LIST_OPERATIONS_VIEW_MODE
        ? <ListBox>{table}</ListBox>
        : list
      }
      testId={testId}
    />
  )
})

const VIEW_OPTIONS = [{
  icon: <MenuOutlinedIcon fontSize="small"/>,
  value: LIST_OPERATIONS_VIEW_MODE,
  tooltip: 'List view',
}, {
  icon: <SegmentItemIcon/>,
  value: DETAILED_OPERATIONS_VIEW_MODE,
  tooltip: 'Detailed view',
}]
