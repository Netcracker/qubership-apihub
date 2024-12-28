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
import { MainPageCard } from '@apihub/routes/root/MainPage/MainPageCard'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { isBoolean } from '@netcracker/qubership-apihub-ui-shared/utils/types'

export const GroupPage: FC = memo(() => {
  const { groupId: groupKey = '' } = useParams()

  const [groupPackage] = usePackage({ packageKey: groupKey, showParents: true })

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
