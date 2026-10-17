import type { Page } from '@playwright/test'
import { SearchBar, TagButton } from '@shared/components/base'

export class ComparePackagesSidebar {

  readonly searchbar = new SearchBar(this.page.getByTestId('SearchTags'), 'Tags')

  constructor(private readonly page: Page) { }

  getTagButton(tagName?: string): TagButton {
    if (tagName) {
      return new TagButton( this.page.getByTestId('TagsList').getByRole('button', { name: tagName, exact: true }), tagName)
    } else {
      return new TagButton(this.page.getByTestId('TagsList').getByRole('button'))
    }
  }
}
