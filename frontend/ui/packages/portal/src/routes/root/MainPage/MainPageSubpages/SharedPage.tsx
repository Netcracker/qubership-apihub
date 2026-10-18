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
import {
  useActivityHistoryFiltersContext,
  useSetActivityHistoryFiltersContext,
} from '../ActivityHistoryFiltersProvider'
import type { ActivityHistoryQueryResult } from '../../useActivityHistory'
import { useActivityHistory } from '../../useActivityHistory'
import { ActivityHistoryCard } from './ActivityHistoryCard'
import { Box } from '@mui/material'
import { DASHBOARD_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { MainPageCard } from '@apihub/routes/root/MainPage/MainPageCard'
import { SHARED_PAGE_REFERER } from '@apihub/entities/referer-pages-names'

export const SharedPage: FC = memo(() => {
  const { textFilter, types } = useActivityHistoryFiltersContext()
  const setActivityHistoryFilters = useSetActivityHistoryFiltersContext()

  const useActivity = (enabled: boolean): ActivityHistoryQueryResult => {
    return useActivityHistory({
      kind: [PACKAGE_KIND, DASHBOARD_KIND],
      types: types,
      textFilter: textFilter,
      onlyShared: true,
      enabled: enabled,
    })
  }

  return (
    <Box display="flex" width="100%">
      <MainPageCard
        title="Shared"
        hideViewSelector
        pageKey={SHARED_PAGE_REFERER}
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
