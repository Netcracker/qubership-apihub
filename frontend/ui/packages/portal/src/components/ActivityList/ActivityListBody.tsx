import type { FC } from 'react'
import React, { memo } from 'react'

import { ActivityListItem } from './ActivityListItem'
import { ActivityListSkeleton } from './ActivityListSkeleton'
import type { Activity } from '../../entities/activities'
import type { ActivityType } from '../../entities/activity-enums'
import { AVAILABLE_EVENT_TYPES } from '../../entities/activity-enums'
import {
  CONTENT_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { Box } from '@mui/material'

export type ActivityListBodyProps = Partial<{
  activities: ReadonlyArray<Activity>
  textFilter: string
  types: ReadonlyArray<ActivityType>
  placeholderText: string
  isLoading: boolean
}>

// First Order Component //
export const ActivityListBody: FC<ActivityListBodyProps> = memo((props) => {
  const {
    activities = [],
    isLoading = false,
    types = [],
    textFilter,
    placeholderText,
  } = props

  return (
    <Box overflow="auto">
      {isLoading
        ? <ActivityListSkeleton/>
        : <Placeholder
          invisible={isNotEmpty(activities)}
          area={CONTENT_PLACEHOLDER_AREA}
          message={!!textFilter || isNotEmpty(types) ? NO_SEARCH_RESULTS : placeholderText}
        >
          {activities.map((activity, index) => {
            if (!AVAILABLE_EVENT_TYPES.includes(activity.activityType)) {
              console.warn(`Unknown activity type = ${activity.activityType}`)
              return null
            }
            return <ActivityListItem key={`activity-${index}`} activity={activity}/>
          })}
        </Placeholder>
      }
    </Box>
  )
})
