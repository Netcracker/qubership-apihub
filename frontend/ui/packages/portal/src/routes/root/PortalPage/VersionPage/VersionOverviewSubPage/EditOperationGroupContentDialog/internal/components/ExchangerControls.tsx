import type { FC } from 'react'
import * as React from 'react'
import { Box, Tooltip } from '@mui/material'
import { CONTENT_HEIGHT } from '../consts'
import {
  OPERATIONS_ADD_TO_GROUP_ACTION,
  OPERATIONS_REMOVE_FROM_GROUP_ACTION,
  useEventBus,
} from '@portal/routes/EventBusProvider'
import { OutlinedIconButton } from '@netcracker/qubership-apihub-ui-shared/components/OutlinedIconButton'
import { ToLeftIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ToLeftIcon'
import { DISABLED_BUTTON_COLOR, ENABLED_BUTTON_COLOR } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import { ToRightIcon } from '@netcracker/qubership-apihub-ui-shared/icons/ToRightIcon'

const VerticalDivider: FC = () => {
  return (
    <Box sx={{
      width: '1px',
      height: '100%',
      borderLeft: '1px solid #D5DCE3',
      marginLeft: '5px',
      marginRight: '5px',
    }}/>
  )
}

export type ExchangerControlProps = {
  disabled: boolean
  message?: string
}

export type ExchangerControlsProps = {
  toLeftArrow: ExchangerControlProps
  toRightArrow: ExchangerControlProps
}

export const ExchangerControls: FC<ExchangerControlsProps> = (props) => {
  const { toLeftArrow, toRightArrow } = props

  const { onOperationMoved } = useEventBus()

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      height={CONTENT_HEIGHT}
    >
      <VerticalDivider/>
      <OutlinedIconButton
        disabled={toLeftArrow.disabled}
        startIcon={<ToLeftIcon color={toLeftArrow.disabled ? DISABLED_BUTTON_COLOR : ENABLED_BUTTON_COLOR}/>}
        onClick={() => onOperationMoved(OPERATIONS_REMOVE_FROM_GROUP_ACTION)}
        data-testid="ToLeftButton"
      />
      {/* Docs: https://mui.com/material-ui/react-tooltip/#disabled-elements */}
      <Tooltip title={toRightArrow.disabled ? toRightArrow.message : undefined}>
        <span>
          <OutlinedIconButton
            disabled={toRightArrow.disabled}
            startIcon={<ToRightIcon color={toRightArrow.disabled ? DISABLED_BUTTON_COLOR : ENABLED_BUTTON_COLOR}/>}
            onClick={() => onOperationMoved(OPERATIONS_ADD_TO_GROUP_ACTION)}
            data-testid="ToRightButton"
          />
        </span>
      </Tooltip>
      <VerticalDivider/>
    </Box>
  )
}
