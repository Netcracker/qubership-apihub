import type { Locator } from '@playwright/test'
import { Dropdown } from './Dropdown'
import { ListItem } from '../ListItem'

export class Select extends Dropdown {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'select')
  }

  getListItem(itemName?: string, options = { exact: true }): ListItem {
    if (itemName) {
      return new ListItem(this.page.getByRole('listbox').getByRole('option', { name: itemName, ...options }), itemName)
    }
    return new ListItem(this.page.getByRole('listbox').getByRole('option'))
  }
}
