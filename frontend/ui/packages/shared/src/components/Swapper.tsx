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
