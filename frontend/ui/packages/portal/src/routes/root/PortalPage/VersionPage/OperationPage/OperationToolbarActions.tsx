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

import type { FC, ReactElement } from 'react'
import React, { memo } from 'react'
import { Box, capitalize, ToggleButton } from '@mui/material'
import { OperationViewModeSelector } from '../OperationViewModeSelector'
import { ComparisonSelectorButton } from '../ComparisonSelectorButton'
import { PLAYGROUND_SIDEBAR_VIEW_MODES } from '../playground-modes'
import { OPERATION_VIEW_MODES } from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import { CustomToggleButtonGroup } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/CustomToggleButtonGroup'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

type SetMode = (value: (string | undefined)) => void

// First Order Component //
export type OperationToolbarActionsProps = {
  playgroundViewMode: string
  setPlaygroundViewMode: SetMode
  apiType: ApiType
  showCompareGroups: boolean
}
export const OperationToolbarActions: FC<OperationToolbarActionsProps> = memo<OperationToolbarActionsProps>((props) => {
  const {
    playgroundViewMode,
    setPlaygroundViewMode,
    apiType,
    showCompareGroups,
  } = props

  return (
    <Box sx={OPERATION_ACTIONS_STYLES}>
      <OperationViewModeSelector modes={OPERATION_VIEW_MODES.get(apiType)!}/>
      <ComparisonSelectorButton showCompareGroups={showCompareGroups}/>
      {/* todo remove after support GraphQL playground */}
      {API_TYPE_PLAYGROUND_MAP[apiType](playgroundViewMode, setPlaygroundViewMode)}
    </Box>
  )
})

const OPERATION_ACTIONS_STYLES = {
  display: 'flex',
  gap: '16px',
  ml: 'auto',
}

const API_TYPE_PLAYGROUND_MAP: Record<ApiType, (playgroundViewMode: string, setPlaygroundViewMode: SetMode) => ReactElement | null> = {
  [API_TYPE_REST]: (playgroundViewMode, setPlaygroundViewMode) => (
    <CustomToggleButtonGroup exclusive value={playgroundViewMode} onClick={setPlaygroundViewMode}>
      {
        PLAYGROUND_SIDEBAR_VIEW_MODES.map(mode => (
          <ToggleButton key={mode} value={mode}>
            {capitalize(mode)}
          </ToggleButton>
        ))
      }
    </CustomToggleButtonGroup>
  ),
  [API_TYPE_GRAPHQL]: () => null,
}
