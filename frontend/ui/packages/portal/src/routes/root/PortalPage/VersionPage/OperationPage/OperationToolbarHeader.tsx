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
import { Box, IconButton, Skeleton, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { OperationSelector } from './OperationSelector'
import type { Path } from '@remix-run/router'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'

export type OperationToolbarHeaderProps = {
  handleBackClick: () => void
  isLoading: boolean
  title: string
  recentOperations: ReadonlyArray<OperationData>
  isRecentOperationsLoading?: boolean
  relatedOperations: Record<string, OperationData[]>
  isRelatedOperationsLoading?: boolean
  prepareLinkFn: (operation: OperationData) => Partial<Path>
}
export const OperationToolbarHeader: FC<OperationToolbarHeaderProps> = memo<OperationToolbarHeaderProps>((props) => {
  const {
    handleBackClick,
    title,
    isLoading,
    recentOperations,
    isRecentOperationsLoading,
    relatedOperations,
    isRelatedOperationsLoading,
    prepareLinkFn,
  } = props

  return (
    <Box sx={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
      <IconButton color="primary" onClick={handleBackClick} data-testid="BackButton">
        <ArrowBackIcon/>
      </IconButton>
      <ToolbarTitle
        value={
          <Box display="flex" component="span">
            {isLoading
              ? <Skeleton variant="text" width="150px"/>
              : <Typography component="span" variant="h5" data-testid="ToolbarTitle">{title}</Typography>}
            <OperationSelector
              recentOperations={recentOperations}
              relatedOperations={relatedOperations}
              isRecentOperationsLoading={isRecentOperationsLoading}
              isRelatedOperationsLoading={isRelatedOperationsLoading}
              prepareLinkFn={prepareLinkFn}
            />
          </Box>
        }
      />
    </Box>
  )
})
