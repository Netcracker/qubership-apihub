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
import React, { memo, useCallback } from 'react'
import { ListItemButton } from '@mui/material'
import type { TestableProps } from './Testable'

const SELECTED_BUTTON_BCG_COLOR = '#ECEDEF'

// First Order Component //
export type CustomListItemButtonProps<T> = {
  keyProp: string
  data: T
  itemComponent: ReactNode
  onClick?: (data: T) => void
  refObject?: React.RefObject<HTMLDivElement>
  isSelected?: boolean
  isSubListItem?: boolean
  size?: ListItemSize
} & TestableProps

function CustomListItemButtonComponent<T>(props: CustomListItemButtonProps<T>): JSX.Element {
  const {
    keyProp,
    data,
    itemComponent,
    refObject,
    onClick,
    testId,
    isSelected,
    isSubListItem = false,
    size = LIST_ITEM_SIZE_SMALL,
  } = props

  const handleClick = useCallback(() => onClick?.(data), [onClick, data])

  return (
    <ListItemButton
      ref={refObject}
      sx={{
        backgroundColor: isSelected ? SELECTED_BUTTON_BCG_COLOR : 'transparent',
        pl: isSubListItem ? 4 : 1,
        height: SIZE_TO_HEIGHT_MAP[size],
      }}
      key={keyProp}
      onClick={handleClick}
      data-testid={testId}
    >
      {itemComponent}
    </ListItemButton>
  )
}

const genericMemo: <T>  (component: T) => T = memo
export const CustomListItemButton = genericMemo(CustomListItemButtonComponent)

export const LIST_ITEM_SIZE_BIG = 'big'
export const LIST_ITEM_SIZE_SMALL = 'small'

export type ListItemSize = typeof LIST_ITEM_SIZE_BIG | typeof LIST_ITEM_SIZE_SMALL

const SIZE_TO_HEIGHT_MAP: Record<ListItemSize, number> = {
  [LIST_ITEM_SIZE_BIG]: 55,
  [LIST_ITEM_SIZE_SMALL]: 24,
}
