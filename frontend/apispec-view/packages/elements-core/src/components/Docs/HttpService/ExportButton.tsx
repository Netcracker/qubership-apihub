import { NativeMenuAdapter } from '@stoplight/elements-core/hoc/NativeMenuAdapter';
import { Box, MenuActionItem, MenuItems } from '@stoplight/mosaic';
import * as React from 'react';
import { useCallback } from 'react';

type ExportMenuProps = Pick<MenuActionItem, 'href' | 'onPress'>;

export interface ExportButtonProps {
  original: ExportMenuProps;
  bundled: ExportMenuProps;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ original, bundled }) => {
  const menuItems = React.useMemo(() => {
    const items: MenuItems = [
      { id: 'original', title: 'Original', ...original },
      { id: 'bundled', title: 'Bundled References', ...bundled },
    ];

    return items;
  }, [original, bundled]);

  const onChange = useCallback(
    event => {
      (
        menuItems?.find(item => {
          const { id } = item as MenuActionItem;
          return id === event.target.value;
        }) as MenuActionItem
      )?.onPress?.(event.target.value);
      event.target.value = 'default';
    },
    [menuItems],
  );

  return (
    <Box>
      <NativeMenuAdapter title="Export" menuItems={menuItems} onChange={onChange}></NativeMenuAdapter>
    </Box>
  );
};
