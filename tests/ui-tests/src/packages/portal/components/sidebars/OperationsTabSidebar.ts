import type { Locator } from '@playwright/test'
import { Autocomplete, SearchBar, TagButton } from '@shared/components/base'
import { GroupFilterAutocomplete } from './OperationsTabSidebar/GroupFilterAutocomplete'
import { ApiKindFilterAutocomplete } from './OperationsTabSidebar/ApiKindFilterAutocomplete'

export class OperationsTabSidebar {

  readonly packageFilterAc = new Autocomplete(this.rootLocator.getByTestId('PackageFilter'), 'Package Filter')
  readonly groupFilterAc = new GroupFilterAutocomplete(this.rootLocator)
  readonly apiKindFilterAc = new ApiKindFilterAutocomplete(this.rootLocator)
  readonly searchbar = new SearchBar(this.rootLocator.getByTestId('SearchTags'), 'Tags')

  constructor(private readonly rootLocator: Locator) { }

  getTagButton(tagName?: string): TagButton {
    if (tagName) {
      return new TagButton(this.rootLocator.getByTestId('TagsList').getByRole('button', { name: tagName, exact: true }), tagName)
    } else {
      return new TagButton(this.rootLocator.getByTestId('TagsList').getByRole('button'))
    }
  }
}
