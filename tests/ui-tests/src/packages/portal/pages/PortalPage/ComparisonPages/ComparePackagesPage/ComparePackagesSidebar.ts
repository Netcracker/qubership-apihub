import type { Page } from '@playwright/test'
import { Button, SearchBar, TagButton } from '@shared/components/base'

export class ComparePackagesSidebar {

  readonly restApiBtn = new Button(this.page.getByTestId('ApiTypeButton-rest'), 'REST API')
  readonly graphQlBtn = new Button(this.page.getByTestId('ApiTypeButton-graphql'), 'GraphQL')
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
