import { MenuItems } from '@stoplight/mosaic';
import * as React from 'react';

import { isSelectableMenuItem } from './menu-items';

export type MenuProps = {
  title: string;
  menuItems: MenuItems;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  backgroundColor?: string;
};

export const NativeMenu: React.FC<MenuProps> = React.memo(props => {
  const { onChange, title, menuItems } = props;
  return (
    <select
      className="native-menu__dropdown"
      defaultValue="default"
      onChange={event => {
        onChange(event);
        event.target.value = 'default';
      }}
    >
      <option disabled value="default" style={{ display: 'none' }}>
        {title}
      </option>
      {menuItems.map((item, index) => {
        if (!isSelectableMenuItem(item)) {
          return null;
        }
        const { id, title } = item;
        return (
          <option key={`${id}-${index}`} value={id}>
            {title}
          </option>
        );
      })}
    </select>
  );
});
