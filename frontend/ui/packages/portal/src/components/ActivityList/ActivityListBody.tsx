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
