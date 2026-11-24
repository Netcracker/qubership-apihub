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
    isSelected,
    isSubListItem = false,
    size = LIST_ITEM_SIZE_SMALL,
    'data-testid': dataTestId,
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
      data-testid={dataTestId}
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
