import type { Page } from '@playwright/test'
import { ListItem, SearchBar, Select } from '@shared/components/base'

export class ComparisonPagePackageSelect extends Select {

  readonly searchbar = new SearchBar(this.page.getByTestId('SearchPackage'), 'Package')

  constructor(page: Page) {
    super(page.getByTestId('PackageSelector'), 'Package')
  }

  getListItem(optionName?: string, options = { exact: true }): ListItem {
    if (optionName) {
      return new ListItem(this.page.getByRole('menu').getByRole('button', { name: optionName, ...options }), optionName)
    }
    return new ListItem(this.page.getByRole('menu').locator('li'))
  }
}
