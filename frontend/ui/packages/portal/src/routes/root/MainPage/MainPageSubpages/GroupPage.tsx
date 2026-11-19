import type { FC } from 'react'
import React, { memo, useMemo } from 'react'
import { usePackage } from '../../usePackage'
import { Box, IconButton } from '@mui/material'
import { PackageBreadcrumbs } from '../../PackageBreadcrumbs'
import { useParams } from 'react-router-dom'
import { useFavorPackage } from '../useFavorPackage'
import { useDisfavorPackage } from '../useDisfavorPackage'
import { FavoriteIconButton } from '../FavoriteIconButton'
import { ActivityHistoryCard } from './ActivityHistoryCard'
import {
  useActivityHistoryFiltersContext,
  useSetActivityHistoryFiltersContext,
} from '../ActivityHistoryFiltersProvider'
import type { ActivityHistoryQueryResult } from '../../useActivityHistory'
import { usePackageActivityHistory } from '../../useActivityHistory'
import { MainPageCard } from '@portal/routes/root/MainPage/MainPageCard'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { isBoolean } from '@netcracker/qubership-apihub-ui-shared/utils/types'

export const GroupPage: FC = memo(() => {
  const { groupId: groupKey = '' } = useParams()

  const [groupPackage] = usePackage({ packageKey: groupKey, showParents: true, cacheTime: 1000 })

  const [favorPackage] = useFavorPackage(groupKey)
  const [disfavorPackage] = useDisfavorPackage(groupKey)
  const isFavorite = groupPackage?.isFavorite

  const { textFilter, types } = useActivityHistoryFiltersContext()
  const setActivityHistoryFilters = useSetActivityHistoryFiltersContext()

  const useActivity = (enabled: boolean): ActivityHistoryQueryResult => {
    return usePackageActivityHistory({
      packageKey: groupKey,
      includeRefs: true,
      types: types,
      textFilter: textFilter,
      enabled: enabled,
    })
  }

  const title = useMemo(
    () => (
      <Box>
        <PackageBreadcrumbs packageObject={groupPackage}/>
        <Box display="flex" gap={1}>
          <IconButton
            sx={{ padding: 0 }}
            onClick={() => {
              !isFavorite ? favorPackage(groupKey) : disfavorPackage(groupKey)
            }}
            data-testid="FavoriteButton"
          >
            {isBoolean(isFavorite) && <FavoriteIconButton isFavorite={isFavorite}/>}
          </IconButton>
          <ToolbarTitle value={groupPackage?.name}/>
        </Box>
      </Box>
    ),
    [disfavorPackage, favorPackage, groupKey, groupPackage, isFavorite],
  )

  return (
    <Box display="flex" width="100%">
      <MainPageCard
        rootPackageKey={groupKey}
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
