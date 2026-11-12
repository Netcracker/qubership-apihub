import type { FC, ReactNode } from 'react'
import * as React from 'react'
import { Box } from '@mui/material'
import type { ExchangerControlsProps } from './ExchangerControls'
import { ExchangerControls } from './ExchangerControls'
import {
  BORDER,
  CONTENT_HEIGHT,
  LIST_WIDTH,
  OVERRIDE_LEFT_SECTION_INDENTS,
  OVERRIDE_RIGHT_SECTION_INDENTS,
} from '../consts'
import { OperationGroupLimit } from './OperationGroupLimit'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'

export type EditOperationGroupContentPopupLayoutProps = {
  navigation: ReactNode
  leftHeader: ReactNode
  leftBody: ReactNode
  exchangerParameters: ExchangerControlsProps
  rightHeader: ReactNode
  rightBody: ReactNode
  rightCount: number
}

export const PopupLayout: FC<EditOperationGroupContentPopupLayoutProps> = (props) => {
  const { navigation, leftHeader, leftBody, exchangerParameters, rightHeader, rightBody, rightCount } = props
  return (
    <Box
      display="flex"
      width="100%"
      borderTop={BORDER}
    >
      {/* Navigation */}
      <Box
        display="flex"
        flexDirection="column"
        width="20%"
        height={CONTENT_HEIGHT}
        borderRight={BORDER}
        data-testid="SidebarPanel"
      >
        {navigation}
      </Box>
      {/* Left List */}
      <Box
        width={LIST_WIDTH}
        height={CONTENT_HEIGHT}
        data-testid="LeftList"
      >
        <BodyCard
          header={leftHeader}
          body={(
            <Box display="flex" height="100%" overflow="auto">
              {leftBody}
            </Box>
          )}
          overrideHeaderSx={OVERRIDE_LEFT_SECTION_INDENTS}
          overrideBodySx={OVERRIDE_LEFT_SECTION_INDENTS}
        />
      </Box>
      {/* Exchanger Controls */}
      <ExchangerControls {...exchangerParameters}/>
      {/* Right List */}
      <Box
        width={LIST_WIDTH}
        height={CONTENT_HEIGHT}
        data-testid="RightList"
      >
        <BodyCard
          header={rightHeader}
          body={(
            <>
              <Box display="flex" flexDirection="column" height="100%" overflow="auto">
                {rightBody}
              </Box>
              <OperationGroupLimit count={rightCount}/>
            </>
          )}
          overrideHeaderSx={OVERRIDE_RIGHT_SECTION_INDENTS}
          overrideBodySx={OVERRIDE_RIGHT_SECTION_INDENTS}
        />
      </Box>
    </Box>
  )
}
