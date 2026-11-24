import type { FC } from 'react'
import React, { memo } from 'react'
import { Box } from '@mui/material'
import type { ActivityHistoryQueryResult } from '../../useActivityHistory'
import { useActivityHistory } from '../../useActivityHistory'
import { ActivityHistoryCard } from './ActivityHistoryCard'
import {
  useActivityHistoryFiltersContext,
  useSetActivityHistoryFiltersContext,
} from '../ActivityHistoryFiltersProvider'
import { MainPageCard } from '@portal/routes/root/MainPage/MainPageCard'
import { DASHBOARD_KIND, GROUP_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useDocumentTitle } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useDocumentTitle'
import { FAVORITE_PAGE_REFERER } from '@portal/entities/referer-pages-names'
import { PAGE_TITLES } from '@portal/routes/pageTitles'

export const FavoritePage: FC = memo(() => {
  useDocumentTitle(PAGE_TITLES.favorite())

  const { textFilter, types } = useActivityHistoryFiltersContext()
  const setActivityHistoryFilters = useSetActivityHistoryFiltersContext()

  const useActivity = (enabled: boolean): ActivityHistoryQueryResult => {
    return useActivityHistory({
      kind: [PACKAGE_KIND, GROUP_KIND, DASHBOARD_KIND],
      types: types,
      textFilter: textFilter,
      onlyFavorite: true,
      enabled: enabled,
    })
  }

  return (
    <Box display="flex" width="100%">
      <MainPageCard
        title="Favorite"
        hideViewSelector
        pageKey={FAVORITE_PAGE_REFERER}
        flatViewKinds={[PACKAGE_KIND, GROUP_KIND, DASHBOARD_KIND]}
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
