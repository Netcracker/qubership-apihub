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

import type { FC, MouseEvent, ReactNode } from 'react'
import * as React from 'react'
import { memo, useRef, useState } from 'react'
import type { ButtonProps, MenuProps } from '@mui/material'
import { Button, CircularProgress, Menu } from '@mui/material'
import { alpha, styled } from '@mui/material/styles'

export type MenuButtonProps = Partial<{
  title: ReactNode
  icon: ReactNode
  alignItems: 'normal' | 'center'
  onClick: (event: MouseEvent) => void
  onItemClick: (event: MouseEvent) => void
  onClose: () => void
  multiple: boolean
  isLoading?: boolean
} & ButtonProps>

export const MenuButton: FC<MenuButtonProps> = memo<MenuButtonProps>(({
  variant,
  color,
  title,
  icon,
  children,
  alignItems,
  onClick,
  onItemClick,
  onClose,
  sx,
  multiple = false,
  isLoading = false,
  ...props
}) => {
  const [anchor, setAnchor] = useState<HTMLElement>()
  const buttonRef = useRef<HTMLElement>()
  const iconOrLoadingIndicator = isLoading ? <CircularProgress sx={{ ml: '2px', mt: '2px' }} size={16}/> : icon

  return (
    <>
      {
        title
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          ? <Button
            {...props}
            sx={sx}
            ref={buttonRef}
            color={color}
            variant={variant}
            onClick={event => {
              setAnchor(event.currentTarget)
              onClick?.(event)
            }}
            {...(title && iconOrLoadingIndicator ? { endIcon: iconOrLoadingIndicator } : {})}
          >
            {title}
          </Button>
          : <Button
            {...props}
            sx={{ width: 32, minWidth: 32, p: 1.25, ...sx }}
            variant={variant}
            size="small"
            onClick={event => {
              setAnchor(event.currentTarget)
              onClick?.(event)
            }}
          >
            {iconOrLoadingIndicator}
          </Button>
      }
      <MenuButtonItems
        anchorEl={anchor}
        open={!!anchor}
        onClick={event => {
          onItemClick?.(event)
          if (multiple) {
            return
          }
          setAnchor(undefined)
          onClose?.()
        }}
        onClose={() => {
          setAnchor(undefined)
          onClose?.()
        }}
        PaperProps={{
          sx: { width: alignItems === 'center' ? buttonRef.current?.offsetWidth : 'auto' },
          style: { marginTop: alignItems === 'center' ? '-8px' : '8px' },
        }}
        anchorOrigin={alignItems === 'center' ? { vertical: 'top', horizontal: 'left' } : {
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={alignItems === 'center' ? { vertical: 'bottom', horizontal: 'left' } : {
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {children}
      </MenuButtonItems>
    </>
  )
})

export const MenuButtonItems = styled(memo<MenuProps>(props => <Menu {...props}/>))(({
  theme: {
    palette: {
      action,
      grey,
      mode,
      primary,
      text,
    }, spacing,
  },
}) => ({
  '& .MuiPaper-root': {
    borderRadius: 6,
    marginTop: spacing(1),
    minWidth: 90,
    color: mode === 'light' ? 'rgb(55, 65, 81)' : grey[300],
    boxShadow: 'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
    '& .MuiMenu-list': {
      padding: '4px 0',
    },
    '& .MuiMenuItem-root': {
      '& .MuiSvgIcon-root': {
        fontSize: 18,
        color: text.secondary,
        marginRight: spacing(1.5),
      },
      '&:active': {
        backgroundColor: alpha(
          primary.main,
          action.selectedOpacity,
        ),
      },
    },
  },
}))
