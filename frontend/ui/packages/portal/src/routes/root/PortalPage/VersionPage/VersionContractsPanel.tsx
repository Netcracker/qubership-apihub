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

import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import type { FC, MutableRefObject, ReactNode } from 'react'
import { memo, useCallback } from 'react'
import { useParams } from 'react-router-dom'

import { isApiTypeSelectorShown } from '@apihub/utils/operation-types'
import { RichFiltersLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/RichFiltersLayout'
import { ListBox } from '@netcracker/qubership-apihub-ui-shared/components/Panels/ListBox'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import { PageTitle } from '@netcracker/qubership-apihub-ui-shared/components/Titles/PageTitle'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import {
  CONTRACT_TYPE_MCP,
  type ContractType,
  toRouteApiType,
} from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DASHBOARD_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import { SegmentItemIcon } from '@netcracker/qubership-apihub-ui-shared/icons/SegmentItemIcon'
import type { OperationsViewMode } from '@netcracker/qubership-apihub-ui-shared/types/views'
import {
  DETAILED_OPERATIONS_VIEW_MODE,
  LIST_OPERATIONS_VIEW_MODE,
} from '@netcracker/qubership-apihub-ui-shared/types/views'
import { usePackage } from '../../usePackage'
import { useSetSelectedPreviewOperation } from '../SelectedPreviewOperationProvider'
import { useCheckOperationFiltersApplied } from './useCheckOperationFiltersApplied'
import { useEnsureValidRouteApiType } from './useEnsureValidRouteApiType'
import { MCP_ENDPOINT_SEARCH_PARAM } from './useMcpEndpointSearchParam'
import { MCP_COLLECTION_SEARCH_PARAM } from './useMcpCollectionSearchParam'
import { useOperationsView } from './useOperationsView'
import { useSetPathParam } from './useSetPathParam'
import { useVersionTabApiTypes } from './useVersionTabApiTypes'
import { type VersionTabId } from './VersionTabApiTypes/version-tab-allowed-api-types'

export type VersionContractsProps = {
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
  additionalSelectors?: ReactNode
  hideSearch?: boolean
  hideFilterButton?: boolean
  hideViewToggle?: boolean
  hideExport?: boolean
  searchPlaceholder?: string
  versionTabId: VersionTabId
} & TestableProps

// High Order Component //
export const VersionContractsPanel: FC<VersionContractsProps> = memo<VersionContractsProps>(({
  title,
  onContextSearch,
  bodyRef,
  table,
  list,
  filters,
  exportButton,
  operationsViewMode,
  toggleOperationsViewMode,
  toggleHideFiltersPanel,
  hideFiltersPanel,
  additionalSelectors,
  hideSearch = false,
  hideFilterButton = false,
  hideViewToggle = false,
  hideExport = false,
  searchPlaceholder = 'Search Operations',
  versionTabId,
  'data-testid': dataTestId,
}) => {
  const { apiType = DEFAULT_API_TYPE } = useParams<{ apiType?: ApiType | ContractType }>()
  const routeApiType = toRouteApiType(apiType)
  const [packageObject] = usePackage({ showParents: true })
  const setPathParam = useSetPathParam()
  const setSearchParams = useSetSearchParams()
  const setPreviewOperation = useSetSelectedPreviewOperation()
  const { tabs, isLoading } = useVersionTabApiTypes()
  const { allowedApiTypes } = tabs[versionTabId]

  const isDashboard = packageObject?.kind === DASHBOARD_KIND
  const showFilterBadge = useCheckOperationFiltersApplied(isDashboard)

  useEnsureValidRouteApiType(allowedApiTypes, isLoading)

  const [operationsView, setOperationsView] = useOperationsView(operationsViewMode)
  const onOperationsViewChange = useCallback((value: OperationsViewMode | undefined) => {
    if (value) {
      setOperationsView(value)
      toggleOperationsViewMode?.(value)
    }
  }, [setOperationsView, toggleOperationsViewMode])

  const onApiTypeChange = useCallback((nextApiType: ApiType | ContractType) => {
    setPreviewOperation?.(undefined)
    if (routeApiType === CONTRACT_TYPE_MCP && nextApiType !== CONTRACT_TYPE_MCP) {
      setSearchParams({
        [MCP_ENDPOINT_SEARCH_PARAM]: '',
        [MCP_COLLECTION_SEARCH_PARAM]: '',
      }, { replace: true })
    }
    setPathParam?.(nextApiType)
  }, [routeApiType, setPathParam, setPreviewOperation, setSearchParams])

  return (
    <RichFiltersLayout
      title={
        <PageTitle
          apiType={routeApiType}
          allowedApiTypes={allowedApiTypes}
          title={title}
          withApiSelector={isApiTypeSelectorShown(allowedApiTypes)}
          onApiTypeChange={onApiTypeChange}
          additionalSelectors={additionalSelectors}
        />
      }
      searchPlaceholder={searchPlaceholder}
      setSearchValue={onContextSearch}
      hideSearch={hideSearch}
      hideFilterButton={hideFilterButton}
      hideViewToggle={hideViewToggle}
      hideExport={hideExport}
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
        : list}
      data-testid={dataTestId}
    />
  )
})

VersionContractsPanel.displayName = 'VersionContractsPanel'

const VIEW_OPTIONS = [{
  icon: <MenuOutlinedIcon fontSize="small" />,
  value: LIST_OPERATIONS_VIEW_MODE,
  tooltip: 'List view',
}, {
  icon: <SegmentItemIcon />,
  value: DETAILED_OPERATIONS_VIEW_MODE,
  tooltip: 'Detailed view',
}]
