import { Box, capitalize, ToggleButton } from '@mui/material'
import {
  CustomToggleButtonGroup,
} from '@netcracker/qubership-apihub-ui-shared/components/Buttons/CustomToggleButtonGroup'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import {
  API_TYPE_ASYNCAPI,
  API_TYPE_GRAPHQL,
  API_TYPE_REST,
} from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import {
  DEFAULT_VIEW_MODE_MAP_BY_API_TYPE,
  OPERATION_VIEW_MODES,
} from '@netcracker/qubership-apihub-ui-shared/entities/operation-view-mode'
import type { FC, ReactElement } from 'react'
import { memo } from 'react'
import { ComparisonSelectorButton } from '../ComparisonSelectorButton'
import { OperationViewModeSelector } from '../OperationViewModeSelector'
import { PLAYGROUND_SIDEBAR_VIEW_MODES } from '../playground-modes'

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
      <OperationViewModeSelector
        defaultValue={DEFAULT_VIEW_MODE_MAP_BY_API_TYPE[apiType](false)}
        modes={OPERATION_VIEW_MODES.get(apiType)!}
      />
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
  [API_TYPE_ASYNCAPI]: () => null,
}
