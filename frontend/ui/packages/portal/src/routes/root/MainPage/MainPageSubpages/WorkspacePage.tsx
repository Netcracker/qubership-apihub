import type { FC } from 'react'
import React, { memo, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { usePackage } from '../../usePackage'
import { Box, IconButton } from '@mui/material'
import { FavoriteIconButton } from '../FavoriteIconButton'
import { useFavorPackage } from '../useFavorPackage'
import { useDisfavorPackage } from '../useDisfavorPackage'
import type { ActivityHistoryQueryResult } from '../../useActivityHistory'
import { usePackageActivityHistory } from '../../useActivityHistory'
import {
  useActivityHistoryFiltersContext,
  useSetActivityHistoryFiltersContext,
} from '../ActivityHistoryFiltersProvider'
import { ActivityHistoryCard } from './ActivityHistoryCard'
import { READ_PERMISSION } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { isBoolean } from '@netcracker/qubership-apihub-ui-shared/utils/types'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { MainPageCard } from '@portal/routes/root/MainPage/MainPageCard'
import { CONTENT_PLACEHOLDER_AREA, NO_PERMISSION, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'

export const WorkspacePage: FC = memo(() => {
  const { workspaceKey = '' } = useParams()

  const [workspace, isLoadingWorkspace] = usePackage({ packageKey: workspaceKey, hideError: true })

  const [favorPackage] = useFavorPackage(workspaceKey, workspaceKey)
  const [disfavorPackage] = useDisfavorPackage(workspaceKey, workspaceKey)
  const isFavorite = workspace?.isFavorite

  const hasReedPermissionWorkspace = workspace?.permissions?.includes(READ_PERMISSION)

  const { textFilter, types } = useActivityHistoryFiltersContext()
  const setActivityHistoryFilters = useSetActivityHistoryFiltersContext()

  const useActivity = (enabled: boolean): ActivityHistoryQueryResult => {
    return usePackageActivityHistory({
      packageKey: workspaceKey,
      includeRefs: true,
      types: types,
      textFilter: textFilter,
      enabled: enabled,
    })
  }

  const title = useMemo(
    () => (
      <Box display="flex" gap={1}>
        <IconButton
          sx={{ padding: 0 }}
          onClick={() => {
            !isFavorite ? favorPackage(workspaceKey) : disfavorPackage(workspaceKey)
          }}
          data-testid="FavoriteButton"
        >
          {isBoolean(isFavorite) && <FavoriteIconButton isFavorite={isFavorite}/>}
        </IconButton>
        <ToolbarTitle value={workspace?.name}/>
      </Box>
    ),
    [disfavorPackage, favorPackage, isFavorite, workspace?.name, workspaceKey],
  )

  if (!hasReedPermissionWorkspace && !isLoadingWorkspace) {
    return <MainPageCard
      title=""
      hideSearchBar
      hideViewSelector
      content={
        <Placeholder
          invisible={false}
          area={CONTENT_PLACEHOLDER_AREA}
          message={NO_PERMISSION}
        />
      }
    />
  }

  return (
    <Box display="flex" width="100%">
      <MainPageCard
        rootPackageKey={workspaceKey}
        title={title}
      />
      <ActivityHistoryCard
        useActivity={useActivity}
        types={types}
        textFilter={textFilter}
        onChangeFilters={setActivityHistoryFilters}
      />
    </Box>
  )
})
