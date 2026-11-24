import { cn } from '@apihub/utils/common/cn'
import { useRef, type FC } from 'react'
import { UxContextMenuItem } from './UxContextMenuItem/UxContextMenuItem'
import { useClickAway } from 'react-use'
import './UxContextMenu.css'
import { MenuItem } from './types/MenuItem'

export type UxContextMenuProps = {
  visible: boolean
  onClickAway: () => void
  menuItems: MenuItem[]
}

export const UxContextMenu: FC<UxContextMenuProps> = (props) => {
  const { visible, onClickAway, menuItems } = props

  const ref = useRef(null)
  useClickAway(ref, onClickAway)

  if (!visible) {
    return null
  }

  return (
    <ul
      ref={ref}
      className={cn("absolute bg-white w-max rounded-md z-10 UxContextMenu")}
    >
      {menuItems.map(menuItem => {
        const { label, onClick } = menuItem
        return (
          <UxContextMenuItem
            label={label}
            onClick={() => {
              onClick()
              onClickAway()
            }}
          />
        )
      })}
    </ul>
  )
}
