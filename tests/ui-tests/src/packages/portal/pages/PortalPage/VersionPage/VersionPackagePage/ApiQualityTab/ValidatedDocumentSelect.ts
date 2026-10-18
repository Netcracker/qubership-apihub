import type { Page } from '@playwright/test'
import { Dropdown, ListItem, SearchBar } from '@shared/components/base'

export class ValidatedDocumentSelect extends Dropdown {
  readonly searchBar = new SearchBar(
    this.page.getByTestId('ValidatedDocumentSearchBar'),
    'Validated document',
  )

  constructor(protected readonly page: Page) {
    super(page.getByTestId('ValidatedDocumentSelectorButton'), 'Validated document')
  }

  getListItem(name?: string): ListItem {
    return new ListItem(
      this.page.getByRole('menu').getByRole('listitem').getByRole('button', { name: name }),
      name,
    )
  }
}
