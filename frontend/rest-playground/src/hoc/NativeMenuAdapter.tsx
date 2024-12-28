import { Box, MenuActionItem, MenuItems } from '@stoplight/mosaic'
import { nanoid } from 'nanoid'
import * as React from 'react'

export interface NativeMenuAdapterProps {
  title: string;
  menuItems: MenuItems;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  backgroundColor?: string;
}

export const NativeMenuAdapter: React.FC<NativeMenuAdapterProps> = ({
  title,
  menuItems,
  onChange,
  backgroundColor,
}) => {
  return (
    <Box>
      <select
        className="sl-menu-adapter"
        defaultValue="default"
        onChange={onChange}
        style={{ backgroundColor: `${backgroundColor ?? 'white'}` }}
      >
        <option disabled value="default">
          {title}
        </option>
        {menuItems.map(item => {
          const { id, title } = item as MenuActionItem
          return (
            item && (
              <option key={nanoid(8)} value={id}>
                {title}
              </option>
            )
          )
        })}
      </select>
    </Box>
  )
}
