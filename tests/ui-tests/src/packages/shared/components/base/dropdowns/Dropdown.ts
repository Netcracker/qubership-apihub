import type { Locator } from '@playwright/test'
import { BaseComponent } from '../BaseComponent'
import type { ListItem } from '@shared/components/base'

export abstract class Dropdown extends BaseComponent {

  protected readonly page = this.mainLocator.page()

  protected constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'dropdown')
  }

  abstract getListItem(itemName?: string, options?: { exact: boolean }): ListItem
}
