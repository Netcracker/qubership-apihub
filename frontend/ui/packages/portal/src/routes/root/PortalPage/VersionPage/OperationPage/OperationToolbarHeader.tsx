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
