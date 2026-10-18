import type { Locator } from '@playwright/test'
import { ListItem } from './ListItem'

export class MenuItem extends ListItem {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'menu item')
  }
}
