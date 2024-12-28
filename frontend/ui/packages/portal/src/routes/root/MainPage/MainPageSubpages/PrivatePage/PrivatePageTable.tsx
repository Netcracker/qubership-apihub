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

import { Box, IconButton, Table, TableBody, TableContainer } from '@mui/material'
import type { FC } from 'react'
import React, { memo, useMemo } from 'react'
import { MainPageCard } from '../../MainPageCard'
import {
  useActivityHistoryFiltersContext,
  useSetActivityHistoryFiltersContext,
} from '../../ActivityHistoryFiltersProvider'
import type { ActivityHistoryQueryResult } from '../../../useActivityHistory'
import { usePackageActivityHistory } from '../../../useActivityHistory'
import { FavoriteIconButton } from '../../FavoriteIconButton'
import { useFavorPackage } from '../../useFavorPackage'
import { useDisfavorPackage } from '../../useDisfavorPackage'
import { usePackage } from '../../../usePackage'
import { ActivityHistoryCard } from '../ActivityHistoryCard'
import { TableSkeleton } from '../../PackagesTable'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { isBoolean } from '@netcracker/qubership-apihub-ui-shared/utils/types'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'

type PrivatePageTable = {
  workspaceId: Key
  isIdLoading: boolean
}

export const PrivatePageTable: FC<PrivatePageTable> = memo(({ workspaceId, isIdLoading }) => {
  const [workspace] = usePackage({ packageKey: workspaceId, hideError: true })

  const [favorPackage] = useFavorPackage(workspaceId, workspaceId)
  const [disfavorPackage] = useDisfavorPackage(workspaceId, workspaceId)
  const isFavorite = workspace?.isFavorite

  const { textFilter, types } = useActivityHistoryFiltersContext()
  const setActivityHistoryFilters = useSetActivityHistoryFiltersContext()

  const useActivity = (enabled: boolean): ActivityHistoryQueryResult => {
    return usePackageActivityHistory({
      packageKey: workspaceId,
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
            !isFavorite ? favorPackage(workspaceId) : disfavorPackage(workspaceId)
          }}
        >
          {isBoolean(isFavorite) && <FavoriteIconButton isFavorite={isFavorite}/>}
        </IconButton>
        <ToolbarTitle value={workspace?.name}/>
      </Box>
    ),
    [disfavorPackage, favorPackage, isFavorite, workspace?.name, workspaceId],
  )

  if (isIdLoading) {
    return (
      <Placeholder
        invisible={isIdLoading}
        area={CONTENT_PLACEHOLDER_AREA}
        message={''}
      >
        <TableContainer>
          <Table>
            <TableBody>
              {isIdLoading && <TableSkeleton/>}
            </TableBody>
          </Table>
        </TableContainer>
      </Placeholder>
    )
  }

  return (
    <Box display="flex" width="100%">
      <MainPageCard
        rootPackageKey={workspaceId}
        title={title}
        pageKey={workspaceId}
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



