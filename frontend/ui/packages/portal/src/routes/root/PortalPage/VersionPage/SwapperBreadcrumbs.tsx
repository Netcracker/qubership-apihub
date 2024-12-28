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
import { ComparedPackagesBreadcrumbs } from '../../ComparedPackagesBreadcrumbs'
import { Box, Typography } from '@mui/material'
import { OverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/OverflowTooltip'
import type { ComparedPackagesBreadcrumbsData } from './breadcrumbs'
import { isLinkedComparedBreadcrumbPathItem } from './breadcrumbs'

type SwapperBreadcrumbsProps = {
  side: 'before' | 'after'
  data: ComparedPackagesBreadcrumbsData | null
}

const SWAPPER_TEXT_STYLES = {
  width: 'calc(100% - 32px - 28px)',
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
}

export const SwapperBreadcrumbs: FC<SwapperBreadcrumbsProps> = memo<SwapperBreadcrumbsProps>(({ side, data }) => {
  const breadcrumbsList = (side === 'before' ? data?.origin : side === 'after' ? data?.changed : null) ?? []
  const linkedBreadcrumbs = breadcrumbsList.slice(0, -1).filter(isLinkedComparedBreadcrumbPathItem)
  const textBreadcrumb = breadcrumbsList.at(-1)

  return (
    <>
      <ComparedPackagesBreadcrumbs data={linkedBreadcrumbs}/>
      <OverflowTooltip title={textBreadcrumb?.name}>
        <Box sx={SWAPPER_TEXT_STYLES} data-testid="SwapperTitle">
          <Typography fontWeight="600">{textBreadcrumb?.name}</Typography>
          <Typography variant="subtitle2" fontSize={13}>{textBreadcrumb?.description}</Typography>
        </Box>
      </OverflowTooltip>
    </>
  )
})
