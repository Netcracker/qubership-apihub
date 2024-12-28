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
import React, { memo } from 'react'
import { Box, IconButton } from '@mui/material'
import { SwapperBreadcrumbs } from './SwapperBreadcrumbs'
import { VERSION_SWAPPER_HEIGHT } from './shared-styles'
import { Swapper } from '@netcracker/qubership-apihub-ui-shared/components/Swapper'
import { EditIcon } from '@netcracker/qubership-apihub-ui-shared/icons/EditIcon'
import type { ComparedPackagesBreadcrumbsData } from './breadcrumbs'

export type ComparisonSwapper = {
  breadcrumbsData: ComparedPackagesBreadcrumbsData | null
  handleSwap: () => void
  showCompareDialog: () => void
}

export const ComparisonSwapper: FC<ComparisonSwapper> = memo<ComparisonSwapper>(({
  breadcrumbsData,
  handleSwap,
  showCompareDialog,
}) => {
  return (
    <Box sx={SWAPPER_STYLES}>
      <Box sx={SWAPPER_HEADER_STYLES} data-testid="LeftSwapperHeader">
        <SwapperBreadcrumbs side="before" data={breadcrumbsData}/>
      </Box>
      <Box sx={SWAPPER_DELIMITER_STYLES}>
        <Box sx={SWAPPER_ARROW_STYLES}>
          <Swapper onSwap={handleSwap}/>
        </Box>
      </Box>
      <Box sx={SECOND_SWAPPER_HEADER_STYLES}>
        <Box gridArea="data" data-testid="RightSwapperHeader">
          <SwapperBreadcrumbs side="after" data={breadcrumbsData}/>
        </Box>
        <IconButton
          sx={{ gridArea: 'action', marginLeft: 'auto', alignItems: 'center' }}
          onClick={showCompareDialog}
          data-testid="EditButton"
        >
          <EditIcon/>
        </IconButton>
      </Box>
    </Box>
  )
})

const SWAPPER_STYLES = {
  borderBottom: '1px solid #D9D9D9',
  display: 'flex',
  height: VERSION_SWAPPER_HEIGHT,
}

const SWAPPER_HEADER_STYLES = {
  padding: '10px 16px',
  width: 'calc(50% - 4px)',
}

const SECOND_SWAPPER_HEADER_STYLES = {
  padding: '10px 0 10px 16px',
  width: 'calc(50% - 4px)',
  display: 'grid',
  gridTemplateAreas: `
   'data action'
    `,
}

const SWAPPER_DELIMITER_STYLES = {
  backgroundColor: '#D9D9D9',
  height: '60px',
  position: 'relative',
  width: '1px',
}

const SWAPPER_ARROW_STYLES = {
  background: '#FFF',
  left: '-14px',
  position: 'absolute',
  top: '16px',
}
