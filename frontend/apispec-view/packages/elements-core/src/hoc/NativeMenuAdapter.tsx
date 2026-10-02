import { Box, MenuItems } from '@stoplight/mosaic';
import * as React from 'react';

import { isSelectableMenuItem } from './menu-items';

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
    </Box>
  );
};
