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

import type { ReactNode } from 'react'
import * as React from 'react'
import { forwardRef } from 'react'
import type { ToggleButtonProps } from '@mui/material'
import { ToggleButton, Tooltip } from '@mui/material'

type TooltipToggleButtonProps = ToggleButtonProps & {
  hint: string | ReactNode
  disableHint?: boolean
}

/* Typed through forwardRef's own generics rather than annotated as FC. A
   ForwardRefExoticComponent is not an FC, and @types/react 18.3 is the first version whose
   propTypes are precise enough to say so: FC's propTypes admit a string ref (LegacyRef) and
   forwardRef's do not. The FC annotation was always wrong; it was silently accepted before. */
export const ToggleButtonWithHint = forwardRef<HTMLButtonElement, TooltipToggleButtonProps>(
  ({ hint, disableHint, ...props }, ref) => {
    return disableHint
      ? <ToggleButton ref={ref} {...props} />
      : (
        <Tooltip
          title={hint}
          disableHoverListener={disableHint}
        >
          <span><ToggleButton ref={ref} {...props} /></span>
        </Tooltip>
      )
  },
)

// by https://github.com/mui/material-ui/issues/18091
export const TOGGLE_BUTTON_DISABLING_START_STYLE = {
  '&.MuiButtonBase-root.Mui-disabled': {
    borderRadius: '6px 0 0 6px',
    border: '1px solid #D5DCE3',
    borderRight: 'none',
  },
}

export const TOGGLE_BUTTON_ENABLING_START_STYLE = {
  borderRadius: '6px 0 0 6px!important',
}

export const TOGGLE_BUTTON_DISABLING_END_STYLE = {
  '&.MuiButtonBase-root.Mui-disabled': {
    padding: '15px 25px',
    margin: '0px',
    borderRadius: '0px 6px 6px 0px',
    border: '1px solid #D5DCE3',
    borderLeft: 'none',
  },
}

export const TOGGLE_BUTTON_ENABLING_END_STYLE = {
  borderRadius: '0 6px 6px 0!important',
}

