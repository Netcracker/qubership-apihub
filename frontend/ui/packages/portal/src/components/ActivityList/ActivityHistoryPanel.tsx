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
import { Box, Card, ListItemIcon, Typography } from '@mui/material'
import { ActivityListFilters } from './ActivityListFilters'
import { ActivityListBody } from './ActivityListBody'
import ListItemButton from '@mui/material/ListItemButton'
import type { Activity } from '../../entities/activities'
import type { ActivityType } from '../../entities/activity-enums'
import { DEFAULT_PAPER_SHADOW } from '@netcracker/qubership-apihub-ui-shared/themes/palette'
import { KeyboardDoubleArrowRightIcon } from '@netcracker/qubership-apihub-ui-shared/icons/KeyboardDoubleArrowRightIcon'

export type ActivityHistoryPanelProps = {
  onCollapse: () => void
  activities?: ReadonlyArray<Activity>
  textFilter?: string
  types?: ReadonlyArray<ActivityType>
  isLoading?: boolean
  onChangeFilters?: (filters: {
    types?: ReadonlyArray<ActivityType>
    textFilter?: string
  }) => void
  placeholderText?: string
}

// First Order Component //
export const ActivityHistoryPanel: FC<ActivityHistoryPanelProps> = memo((props) => {
    const {
      onCollapse,
      activities = [],
      isLoading = false,
      types = [],
      textFilter,
      onChangeFilters,
      placeholderText,
    } = props

    return (
      <>
        <Card sx={{
          display: 'grid',
          gridTemplateRows: 'max-content 1fr',
          width: '100%',
          boxShadow: DEFAULT_PAPER_SHADOW,
          flex: 1,
          borderRadius: '10px 0 0 10px',
          p: 3,
        }}
        data-testid="ActivityHistoryPanel">
          <Box>
            <Box
              sx={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: '1fr auto',
                pt: '6px',
                pb: '6px',
                mb: 1,
              }}
            >
              <Typography variant="body2" fontWeight="600" fontSize={15}>Activity History</Typography>
              <ListItemButton
                onClick={onCollapse}
                sx={{
                  height: '20px',
                  flexDirection: 'row',
                }}
                data-testid="CollapseButton"
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 1,
                    mt: '4px',
                    justifyContent: 'center',
                  }}
                >
                  <KeyboardDoubleArrowRightIcon size={11}/>
                </ListItemIcon>
                <Typography fontWeight="500" fontSize={13} color="#0068FF">Collapse</Typography>
              </ListItemButton>
            </Box>
            <Box pb={3}>
              <ActivityListFilters
                text={textFilter}
                types={types}
                onChangeFilters={onChangeFilters}
              />
            </Box>
          </Box>
          <Box overflow="hidden auto">
            <ActivityListBody
              activities={activities}
              types={types}
              textFilter={textFilter}
              placeholderText={placeholderText}
              isLoading={isLoading}
            />
          </Box>
        </Card>
      </>
    )
  },
)
