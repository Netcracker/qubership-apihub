import type { FC } from 'react'
import { memo } from 'react'
import { Box, IconButton, styled, Tooltip } from '@mui/material'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'

export type SwapperProps = {
  onSwap: () => void
  disabledReason?: string
}

export const Swapper: FC<SwapperProps> = memo<SwapperProps>(({ onSwap, disabledReason }) => {
  return (
    <Tooltip title={disabledReason ?? 'Swap'}>
      <SwapperButtonWrapper>
        <IconButton
          size="small"
          color="primary"
          disabled={!!disabledReason}
          onClick={onSwap}
          data-testid="SwapButton"
        >
          <SwapHorizOutlinedIcon/>
        </IconButton>
      </SwapperButtonWrapper>
    </Tooltip>
  )
})

Swapper.displayName = 'Swapper'

const SwapperButtonWrapper = styled(Box)({
  display: 'inline-flex',
})
