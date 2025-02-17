import type { Locator, Page } from '@playwright/test'
import { BaseList } from '@shared/components/custom/lists'

/** @deprecated */
export class OptionsList extends BaseList {

  constructor(protected readonly page: Page) {
    super()
  }

  getListItem(itemName: string, options = { exact: true }): Locator {
    return this.page.getByRole('option', { name: itemName, exact: options.exact })
  }
}
