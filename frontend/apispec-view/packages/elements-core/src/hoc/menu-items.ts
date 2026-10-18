import { MenuActionItem, MenuItems } from '@stoplight/mosaic';

export const isSelectableMenuItem = (item: MenuItems[number]): item is MenuActionItem =>
  !!item && typeof item === 'object' && 'id' in item;
