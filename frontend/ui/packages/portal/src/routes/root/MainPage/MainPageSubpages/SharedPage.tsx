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
import { MainPageCard } from '@portal/routes/root/MainPage/MainPageCard'
import { SHARED_PAGE_REFERER } from '@portal/entities/referer-pages-names'

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
