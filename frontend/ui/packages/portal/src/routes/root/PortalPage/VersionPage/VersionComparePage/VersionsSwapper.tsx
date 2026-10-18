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
import React, { memo, useCallback } from 'react'
import { Box, IconButton } from '@mui/material'
import { useIsPackageFromDashboard } from '../../useIsPackageFromDashboard'
import type { ComparedPackagesBreadcrumbsData } from '../breadcrumbs'
import { SwapperBreadcrumbs } from '../SwapperBreadcrumbs'
import { useVersionsComparisonGlobalParams } from '../VersionsComparisonGlobalParams'
import { VERSION_SWAPPER_HEIGHT } from '../shared-styles'
import { useNavigation } from '../../../../NavigationProvider'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import {
  API_TYPE_SEARCH_PARAM,
  PACKAGE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { Swapper } from '@netcracker/qubership-apihub-ui-shared/components/Swapper'
import { EditIcon } from '@netcracker/qubership-apihub-ui-shared/icons/EditIcon'

export type VersionsSwapperProps = {
  breadcrumbsData: ComparedPackagesBreadcrumbsData | null
}

export const VersionsSwapper: FC<VersionsSwapperProps> = memo<VersionsSwapperProps>(({ breadcrumbsData }) => {
  const {
    originPackageKey,
    originVersionKey,
    changedPackageKey,
    changedVersionKey,
    apiType,
  } = useVersionsComparisonGlobalParams()

  const { isPackageFromDashboard, refPackageKey } = useIsPackageFromDashboard()

  const { navigateToVersionsComparison } = useNavigation()
  const { showCompareVersionsDialog } = useEventBus()

  const handleSwap = useCallback(() => {
    navigateToVersionsComparison({
      packageKey: originPackageKey ?? changedPackageKey!,
      versionKey: originVersionKey!,
      search: {
        [VERSION_SEARCH_PARAM]: { value: changedVersionKey },
        [PACKAGE_SEARCH_PARAM]: { value: originPackageKey !== changedPackageKey ? changedPackageKey : '' },
        [REF_SEARCH_PARAM]: { value: isPackageFromDashboard ? refPackageKey : undefined },
        [API_TYPE_SEARCH_PARAM]: { value: apiType },
      },
    })
  }, [apiType, changedPackageKey, changedVersionKey, isPackageFromDashboard, navigateToVersionsComparison, originPackageKey, originVersionKey, refPackageKey])

  return (
    <Box sx={VERSION_SWAPPER_STYLES}>
      <Box sx={VERSION_SWAPPER_HEADER_STYLES} data-testid="LeftCompareTitle">
        <SwapperBreadcrumbs side="before" data={breadcrumbsData}/>
      </Box>
      <Box sx={VERSION_SWAPPER_DELIMITER_STYLES}>
        <Box sx={VERSION_SWAPPER_ARROW_STYLES}>
          <Swapper onSwap={handleSwap}/>
        </Box>
      </Box>
      <Box sx={VERSION_SECOND_SWAPPER_HEADER_STYLES}>
        <Box gridArea="data" data-testid="RightCompareTitle">
          <SwapperBreadcrumbs side="after" data={breadcrumbsData}/>
        </Box>
        {!isPackageFromDashboard && (
          <IconButton
            sx={{ gridArea: 'action', marginLeft: 'auto', alignItems: 'center' }}
            onClick={showCompareVersionsDialog}
            data-testid="EditButton"
          >
            <EditIcon/>
          </IconButton>
        )}
      </Box>
    </Box>
  )
})

const VERSION_SWAPPER_STYLES = {
  backgroundColor: '#FFF',
  borderBottom: '1px solid #D9D9D9',
  display: 'flex',
  height: VERSION_SWAPPER_HEIGHT,
  position: 'sticky',
  top: 0,
  width: '100%',
  zIndex: '1',
}

const VERSION_SWAPPER_HEADER_STYLES = {
  padding: '10px 16px',
  width: 'calc(50% - 4px)',
}

const VERSION_SECOND_SWAPPER_HEADER_STYLES = {
  padding: '10px 0 10px 16px',
  width: 'calc(50% - 4px)',
  display: 'grid',
  gridTemplateAreas: `
   'data action'
    `,
}

const VERSION_SWAPPER_DELIMITER_STYLES = {
  backgroundColor: '#D9D9D9',
  height: '60px',
  position: 'relative',
  width: '1px',
}

const VERSION_SWAPPER_ARROW_STYLES = {
  background: '#FFF',
  left: '-14px',
  position: 'absolute',
  top: '16px',
}
