import { cn } from '@apihub/utils/common/cn'
import type { FC } from 'react'
import './UxContextMenuItem.css'
import { MenuItem } from '../types/MenuItem'

export type UxContextMenuItemProps = MenuItem

export const UxContextMenuItem: FC<UxContextMenuItemProps> = (props) => {
  const { label, onClick } = props
  return (
    <li
      className={cn("rounded-md py-2 px-4 hover:cursor-pointer text-xs text-black UxContextMenuItem")}
      onClick={onClick}
    >
      {label}
    </li>
  )
}
