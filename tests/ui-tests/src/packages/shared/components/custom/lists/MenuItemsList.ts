import type { Locator, Page } from '@playwright/test'
import { BaseList } from '@shared/components/custom/lists'

/** @deprecated */
export class MenuItemsList extends BaseList {

  constructor(protected readonly page: Page) {
    super()
    this.page = page
  }

  getListItem(itemName: string, options = { exact: true }): Locator {
    return this.page.getByRole('menuitem', { name: itemName, exact: options.exact })
  }
}
