import { MenuActionItem, MenuItems } from '@stoplight/mosaic'
import { nanoid } from 'nanoid'
import * as React from 'react'

export type MenuProps = {
  title: string;
  menuItems: MenuItems;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  backgroundColor?: string;
};

export const NativeMenu: React.FC<MenuProps> = React.memo(props => {
  const { onChange, title, menuItems } = props
  return (
    <select
      className="native-menu__dropdown"
      defaultValue="default"
      onChange={event => {
        onChange(event)
        event.target.value = 'default'
      }}
    >
      <option disabled value="default" style={{ display: 'none' }}>
        {title}
      </option>
      {menuItems.map(item => {
        const { id, title } = item as MenuActionItem
        return (
          <option key={nanoid(8)} value={id}>
            {title}
          </option>
        )
      })}
    </select>
  )
})
