import type { FC } from 'react'
import React, { memo } from 'react'
import { usePackageActivityHistory } from '../../../useActivityHistory'
import { useParams } from 'react-router-dom'
import { Box, Typography } from '@mui/material'
import { ActivityListBody } from '@portal/components/ActivityList/ActivityListBody'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import {
  useActivityHistoryFiltersContext,
  useSetActivityHistoryFiltersContext,
} from '@portal/routes/root/MainPage/ActivityHistoryFiltersProvider'
import type { ActivityType } from '@portal/entities/activity-enums'
import { ActivityListFilters } from '@portal/components/ActivityList/ActivityListFilters'

export const ActivityHistoryByPackageCard: FC = memo(() => {
  const { packageId: packageKey } = useParams()
  const { textFilter, types } = useActivityHistoryFiltersContext()
  const setActivityHistoryFilters = useSetActivityHistoryFiltersContext()

  const { activities, isLoading } = usePackageActivityHistory({
    packageKey: packageKey,
    includeRefs: true,
    types: types,
    textFilter: textFilter,
    enabled: true,
  })

  return (
    <BodyCard
      header={
        <ActivityHistoryByPackageCardHeader
          textFilter={textFilter}
          types={types}
          onChangeFilters={setActivityHistoryFilters}
        />
      }
      body={
        <ActivityListBody
          activities={activities}
          types={types}
          textFilter={textFilter}
          isLoading={isLoading}
        />
      }
    />
  )
})

type ActivityHistoryByPackageCardHeaderProps = Partial<{
  textFilter: string
  types: ReadonlyArray<ActivityType>
  onChangeFilters: (filters: {
    textFilter?: string
    types?: ReadonlyArray<ActivityType>
  }) => void
}>

const ActivityHistoryByPackageCardHeader: FC<ActivityHistoryByPackageCardHeaderProps> = memo<ActivityHistoryByPackageCardHeaderProps>(({
  textFilter,
  types,
  onChangeFilters,
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
      }}
    >
      <Typography variant="inherit">Activity History</Typography>
      <ActivityListFilters
        text={textFilter}
        types={types}
        onChangeFilters={onChangeFilters}
      />
    </Box>
  )
})
