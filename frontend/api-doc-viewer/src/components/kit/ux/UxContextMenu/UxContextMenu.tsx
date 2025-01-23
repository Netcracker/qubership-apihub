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
      className="absolute bg-white w-max rounded-md z-10 UxContextMenu"
      style={{
        top: 'calc(100% + 10px)'
      }}
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
