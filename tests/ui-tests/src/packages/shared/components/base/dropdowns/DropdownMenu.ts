import type { Locator } from '@playwright/test'
import { Dropdown } from './Dropdown'
import { ListItem } from '../ListItem'

export class DropdownMenu extends Dropdown {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'dropdown menu')
  }

  getListItem(itemName?: string): ListItem {
    if (itemName) {
      return new ListItem(this.page.getByRole('menuitem', { name: itemName, exact: true }), itemName)
    } else {
      return new ListItem(this.page.getByRole('menuitem'))
    }
  }
}
