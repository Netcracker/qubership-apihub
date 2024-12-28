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

import type { FC, ReactNode } from 'react'
import React, { memo, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Box, IconButton } from '@mui/material'
import { useOperationLocation } from '../useOperationLocation'
import { useOperationViewMode } from '../useOperationViewMode'
import type { OperationDisplayMode } from './OperationView/OperationDisplayMode'
import {
  COMPARE_DASHBOARDS_MODE,
  COMPARE_DIFFERENT_OPERATIONS_MODE,
  COMPARE_PACKAGES_MODE,
} from './OperationView/OperationDisplayMode'
import { useIsPackageFromDashboard } from '../../useIsPackageFromDashboard'
import { useDocumentSearchParam } from '../useDocumentSearchParam'
import { SwapperBreadcrumbs } from '../SwapperBreadcrumbs'
import { useVersionsComparisonGlobalParams } from '../VersionsComparisonGlobalParams'
import { VERSION_SWAPPER_HEIGHT } from '../shared-styles'
import { useNavigation } from '../../../../NavigationProvider'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import {
  DOCUMENT_SEARCH_PARAM,
  FILTERS_SEARCH_PARAM,
  GROUP_SEARCH_PARAM,
  OPERATION_SEARCH_PARAM,
  PACKAGE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { DOC_OPERATION_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import { Swapper } from '@netcracker/qubership-apihub-ui-shared/components/Swapper'
import { EditIcon } from '@netcracker/qubership-apihub-ui-shared/icons/EditIcon'
import type { ComparedPackagesBreadcrumbsData } from '@apihub/routes/root/PortalPage/VersionPage/breadcrumbs'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type OperationsSwapperProps = {
  displayMode: OperationDisplayMode
  breadcrumbsData: ComparedPackagesBreadcrumbsData | null
  actions: ReactNode
}

export const OperationsSwapper: FC<OperationsSwapperProps> = memo<OperationsSwapperProps>(({
  displayMode,
  breadcrumbsData,
  actions,
}) => {
  const { operationId: changedOperationKey, group, apiType } = useParams()
  const { operationKey: operationKeyParam } = useOperationLocation()
  const originOperationKey = operationKeyParam ?? changedOperationKey
  const [documentSlug] = useDocumentSearchParam()
  const [filters] = useSeverityFiltersSearchParam()

  const previousGroup = useSearchParam(GROUP_SEARCH_PARAM)

  const {
    changedPackageKey,
    changedVersionKey,
    originPackageKey,
    originVersionKey,
  } = useVersionsComparisonGlobalParams()

  const { isPackageFromDashboard, refPackageKey } = useIsPackageFromDashboard()

  const { mode } = useOperationViewMode()
  const { showCompareOperationsDialog } = useEventBus()

  const { navigateToGroupsOperationsSwapper, navigateToOperationsSwapper } = useNavigation()

  const handleSwap = useCallback(() => {
    const searchParams = {
      mode: { value: mode === DOC_OPERATION_VIEW_MODE ? '' : mode },
      [PACKAGE_SEARCH_PARAM]: { value: originPackageKey === changedPackageKey ? '' : changedPackageKey! },
      [VERSION_SEARCH_PARAM]: { value: originVersionKey === changedVersionKey ? '' : changedVersionKey! },
      [OPERATION_SEARCH_PARAM]: { value: originOperationKey === changedOperationKey ? '' : changedOperationKey! },
      [REF_SEARCH_PARAM]: { value: isPackageFromDashboard ? refPackageKey : undefined },
      [DOCUMENT_SEARCH_PARAM]: { value: documentSlug },
      [GROUP_SEARCH_PARAM]: { value: group },
      [FILTERS_SEARCH_PARAM]: { value: filters.join() },
    }

    previousGroup
      ? navigateToGroupsOperationsSwapper({
        packageKey: originPackageKey!,
        versionKey: changedVersionKey!,
        previousGroup: previousGroup!,
        apiType: apiType as ApiType,
        originOperationKey: originOperationKey!,
        search: searchParams,
      })
      : navigateToOperationsSwapper({
        packageKey: originPackageKey!,
        versionKey: originVersionKey!,
        apiType: apiType as ApiType,
        originOperationKey: originOperationKey!,
        search: searchParams,
      })
  }, [mode, originPackageKey, changedPackageKey, originVersionKey, changedVersionKey, originOperationKey, changedOperationKey, isPackageFromDashboard, refPackageKey, documentSlug, group, filters, previousGroup, navigateToGroupsOperationsSwapper, apiType, navigateToOperationsSwapper])

  const isEditButtonEnabled = useMemo(() => (
    [
      COMPARE_DIFFERENT_OPERATIONS_MODE,
      COMPARE_PACKAGES_MODE,
      COMPARE_DASHBOARDS_MODE,
    ].includes(displayMode)
  ), [displayMode])

  return (
    <Box sx={OPERATION_SWAPPER_STYLES}>
      <Box sx={OPERATION_SWAPPER_HEADER_STYLES} data-testid="LeftSwapperHeader">
        {<SwapperBreadcrumbs
          side="before"
          data={breadcrumbsData}
        />}
      </Box>
      <Box sx={OPERATION_SWAPPER_DELIMITER_STYLES}>
        <Box sx={OPERATION_SWAPPER_ARROW_STYLES}>
          <Swapper onSwap={handleSwap}/>
        </Box>
      </Box>
      <Box sx={OPERATION_SECOND_SWAPPER_HEADER_STYLES} data-testid="RightSwapperHeader">
        <Box sx={OPERATION_SECOND_SWAPPER_HEADER_BOX_STYLES}>
          {<SwapperBreadcrumbs
            side="after"
            data={breadcrumbsData}
          />}
        </Box>
        <Box display="flex" flexDirection="row" gap={1} sx={OPERATION_ACTION_STYLES}>
          <Box py={1}>
            {actions}
          </Box>
          {isEditButtonEnabled && (
            <IconButton
              onClick={showCompareOperationsDialog}
              data-testid="EditButton"
            >
              <EditIcon/>
            </IconButton>
          )}
        </Box>
      </Box>

    </Box>
  )
})

const OPERATION_SWAPPER_STYLES = {
  backgroundColor: '#FFF',
  borderBottom: '1px solid #D9D9D9',
  display: 'flex',
  height: VERSION_SWAPPER_HEIGHT,
  position: 'sticky',
  top: 0,
  width: '100%',
  zIndex: '1',
}

const OPERATION_SWAPPER_HEADER_STYLES = {
  padding: '10px 16px',
  width: 'calc(50% - 4px)',
}

const OPERATION_SECOND_SWAPPER_HEADER_STYLES = {
  display: 'flex',
  width: 'calc(50% - 4px)',
  padding: '10px 0 10px 16px',
}

//32px icon
const OPERATION_SECOND_SWAPPER_HEADER_BOX_STYLES = {
  width: 'calc(100% - 4px - 32px)',
}

const OPERATION_SWAPPER_DELIMITER_STYLES = {
  backgroundColor: '#D9D9D9',
  height: '60px',
  position: 'relative',
  width: '1px',
}

const OPERATION_SWAPPER_ARROW_STYLES = {
  background: '#FFF',
  left: '-14px',
  position: 'absolute',
  top: '16px',
}

const OPERATION_ACTION_STYLES = {
  gridArea: 'action',
  alignItems: 'center',
  marginLeft: 'auto',
}
