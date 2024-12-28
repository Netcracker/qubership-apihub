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
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Box, Button, ButtonGroup, ClickAwayListener, Grow, MenuList, Paper, Popper } from '@mui/material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import type { ButtonGroupProps } from '@mui/material/ButtonGroup/ButtonGroup'
import type { SxProps } from '@mui/system'

// TODO: Understand why styles break when moved to `shared` module (check in Editor)
export type MultiButtonProps = {
  primary: ReactElement
  secondary?: ReactElement
  buttonGroupProps?: ButtonGroupProps
  sx?: SxProps
}

export const MultiButton: FC<MultiButtonProps> = memo<MultiButtonProps>(({
  primary,
  secondary,
  buttonGroupProps,
  sx,
}) => {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const onClick = useCallback(() => secondary && setOpen(prevOpen => !prevOpen), [secondary])

  // think about correct button styling by props
  const arrowButton = useMemo(() => {
    const variant = buttonGroupProps?.variant ?? 'contained'
    const backgroundColor = variant === 'outlined' ? 'white' : 'inherit'
    return (
      <Button
        sx={{ width: 48, backgroundColor: backgroundColor }}
        variant={buttonGroupProps?.variant ?? 'contained'}
        onClick={onClick}
      >
        <KeyboardArrowDownOutlinedIcon fontSize="small"/>
      </Button>
    )
  }, [buttonGroupProps, onClick])

  return (
    <Box sx={sx}>
      <ButtonGroup
        {...buttonGroupProps}
        variant={buttonGroupProps?.variant ?? 'contained'}
        ref={anchorRef}
      >
        {primary}
        {arrowButton}
      </ButtonGroup>
      {secondary && (
        <Popper
          open={open}
          anchorEl={anchorRef.current}
          transition
        >
          {({ TransitionProps, placement }) => (
            <Grow {...TransitionProps}
                  style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}>
              <Paper
                sx={({ palette: { grey, mode }, spacing }) => ({
                  borderRadius: '6px',
                  marginTop: spacing(1),
                  minWidth: 90,
                  color: mode === 'light' ? 'rgb(55, 65, 81)' : grey[300],
                  boxShadow: 'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
                })}
              >
                <ClickAwayListener onClickAway={onClick}>
                  <MenuList autoFocusItem children={secondary} onClick={onClick} disablePadding={false}/>
                </ClickAwayListener>
              </Paper>
            </Grow>
          )}
        </Popper>
      )}
    </Box>
  )
})
