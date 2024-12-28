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

import type { FC, ReactNode } from 'react'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Box,
  Button,
  ClickAwayListener,
  Grow,
  IconButton,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  Tooltip,
} from '@mui/material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import { CheckIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CheckIcon'

export type DropdownButtonProps = Readonly<{
  label?: string
  icon?: ReactNode
  options: Array<DropdownButtonOption>
  disabled?: boolean
  hint?: string
  closeOnClick?: boolean
  disableHint?: boolean
}> & TestableProps

type DropdownButtonOption = Readonly<{
  key: string
  label: string
  method?: () => void
  disabled?: boolean
  selected?: boolean
}> & TestableProps

export const DropdownButton: FC<DropdownButtonProps> = memo<DropdownButtonProps>((props) => {
  const {
    label,
    icon,
    options,
    disabled,
    disableHint,
    hint,
    closeOnClick = true,
  } = props

  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)

  const hasSelectedOptions = useMemo(
    () => options.some(option => option?.selected),
    [options],
  )

  const handleMenuItemClick = useCallback((
    option: DropdownButtonOption,
  ) => {
    option?.method?.()
    closeOnClick && setOpen(false)
  }, [closeOnClick])

  return (
    <>
      <Tooltip
        disableHoverListener={disableHint}
        title={hint}
      >
        <Box>
          {label ? (
            <Button
              ref={anchorRef}
              disabled={disabled}
              variant="contained"
              sx={{ pr: '35px', pl: '35px' }}
              startIcon={icon}
              endIcon={open ? <KeyboardArrowUpOutlinedIcon fontSize="small"/> : <KeyboardArrowDownOutlinedIcon
                fontSize="small"/>}
              onClick={() => setOpen((prevOpen) => !prevOpen)}
              data-testid={props.testId}
            >
              {label}
            </Button>
          ) : (
            <IconButton
              ref={anchorRef}
              disabled={disabled}
              onClick={() => setOpen((prevOpen) => !prevOpen)}
              data-testid={props.testId}
            >
              {hasSelectedOptions ? (
                <Badge variant="dot" color="primary">
                  {icon}
                </Badge>
              ) : icon}
            </IconButton>
          )}
        </Box>
      </Tooltip>
      <Popper
        sx={{
          zIndex: 1000,
        }}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === 'bottom' ? 'center top' : 'center bottom',
            }}
          >
            <Paper
              sx={{
                borderRadius: '6px',
                marginTop: '7px',
                background: '#FFFFFF',
                boxShadow: '0px 0px 2px rgba(0, 0, 0, 0.2), 0px 6px 20px rgba(0, 0, 0, 0.15)',
              }}>
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <MenuList id="split-button-menu" autoFocusItem>
                  {options.map((option) => (
                    <MenuItem
                      disabled={option?.disabled}
                      key={option?.key}
                      onClick={() => handleMenuItemClick(option)}
                      data-testid={option.testId}
                    >
                      {option?.selected ? <CheckIcon/> : null}
                      <span style={{
                        marginLeft: option?.selected ? 10 : 25,
                      }}>
                        {option?.label}
                      </span>
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  )
})
