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
import * as React from 'react'
import { memo, useCallback, useMemo } from 'react'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import { Tooltip } from '@mui/material'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import type { CSSObject, Theme } from '@mui/material/styles'
import { styled } from '@mui/material/styles'
import MuiDrawer from '@mui/material/Drawer'
import { KeyboardDoubleArrowLeftIcon } from '../icons/KeyboardDoubleArrowLeftIcon'
import { KeyboardDoubleArrowRightIcon } from '../icons/KeyboardDoubleArrowRightIcon'
import type { SxProps } from '@mui/system'

// Expand/Collapse Sidebar Button
export const TOGGLE_SIDEBAR_BUTTON = 'toggle-sidebar'

export type SidebarMenu = {
  id: string
  title: string
  icon?: ReactNode
  disabled?: boolean
  tooltip?: string
  testId: string
}

export type NavigationMenuProps = {
  open: boolean
  setOpen: (value: boolean) => void
  activeItem: string
  sidebarMenuItems: SidebarMenu[]
  onSelectItem: (newActiveItemId: string) => void
  sidebarServiceMenuItems?: SidebarMenu[]
}

export const NavigationMenu: FC<NavigationMenuProps> = memo<NavigationMenuProps>(({
  open,
  setOpen,
  activeItem,
  sidebarMenuItems,
  sidebarServiceMenuItems,
  onSelectItem,
}) => {

  const handleDrawerToggle = useCallback((): void => {
    setOpen(!open)
  }, [open, setOpen])

  const onClickItem = useCallback((itemId: string) => {
    if (itemId === TOGGLE_SIDEBAR_BUTTON) {
      handleDrawerToggle()
    } else {
      onSelectItem(itemId)
    }
  }, [handleDrawerToggle, onSelectItem])

  const serviceItems: SidebarMenu[] = useMemo(() => [
    ...(sidebarServiceMenuItems ?? []),
    {
      id: TOGGLE_SIDEBAR_BUTTON,
      title: open ? 'Collapse' : 'Expand',
      tooltip: open ? '' : 'Expand',
      icon: (
        open
          ? <KeyboardDoubleArrowLeftIcon/>
          : <KeyboardDoubleArrowRightIcon/>
      ),
      testId: open ? 'CollapseButton' : 'ExpandButton',
    },
  ], [open, sidebarServiceMenuItems])

  return (
    <Box
      height="100%"
      display="grid"
      sx={{ backgroundColor: '#F5F5FA' }}
      borderRadius="10px 0 0 0"
    >
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          borderRadius: '10px 0 0 0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <List sx={{ height: `calc(100% - ${serviceItems.length} *  48px)` }}>
          {sidebarMenuItems.map(menuItem => {
            const { id, title, disabled, tooltip, icon, testId } = menuItem
            return (
              <Tooltip key={`tooltip-${id}`} title={tooltip} disableHoverListener={open && !disabled} placement="right">
                <ListItem key={id} disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    sx={LIST_ITEM_BUTTON_STYLE(activeItem, id)}
                    onClick={() => onClickItem(id)}
                    disabled={disabled}
                    data-testid={testId}
                  >
                    <ListItemIcon sx={LIST_ITEM_ICON_STYLE}>
                      {icon}
                    </ListItemIcon>
                    {open ? <ListItemText primary={title}/> : null}
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            )
          })}
        </List>
        <List sx={{ height: 'auto' }}>
          {serviceItems.map(menuItem => {
            const { id, title, disabled, tooltip, icon, testId } = menuItem
            return (
              <Tooltip key={`tooltip-${id}`} title={tooltip} disableHoverListener={open && !disabled} placement="right">
                <ListItem key={id} disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    sx={LIST_ITEM_BUTTON_STYLE(activeItem, id)}
                    onClick={() => onClickItem(id)}
                    disabled={disabled}
                    data-testid={testId}
                  >
                    <ListItemIcon sx={LIST_ITEM_ICON_STYLE}>
                      {icon}
                    </ListItemIcon>
                    {open && <ListItemText primary={title}/>}
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            )
          })}
        </List>
      </Drawer>
    </Box>
  )
})

const DRAWER_WIDTH = 172

const openedMixin = (theme: Theme): CSSObject => ({
  width: DRAWER_WIDTH,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  position: 'relative',
  backgroundColor: '#F5F5FA',
  overflowX: 'hidden',
  border: 'none',
})

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  border: 'none',
  position: 'relative',
  backgroundColor: '#F5F5FA',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
})

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: DRAWER_WIDTH,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  }),
)

const LIST_ITEM_BUTTON_STYLE = (activeItem: string, id: string): SxProps => ({
  minHeight: 48,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: activeItem === id ? '#FFFFFF' : 'transparent',
  justifyContent: 'center',
  p: 0,
})

const LIST_ITEM_ICON_STYLE = {
  width: '65px',
  minWidth: 0,
  mt: 0,
  justifyContent: 'center',
}
