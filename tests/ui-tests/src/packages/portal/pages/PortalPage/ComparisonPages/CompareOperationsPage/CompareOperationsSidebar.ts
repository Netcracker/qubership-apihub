import type { Page } from '@playwright/test'
import type { GetOperationParams } from '@portal/entities'
import { Button, OperationButton, Placeholder, SearchBar, TagButton } from '@shared/components/base'
import { DocumentFilterAutocomplete } from './CompareOperationsSidebar/DocumentFilterAutocomplete'

export class CompareOperationsSidebar {

  readonly filtersBtn = new Button(this.page.getByTestId('FiltersAccordionButton'), 'Filters')
  readonly documentFilterAc = new DocumentFilterAutocomplete(this.page)
  readonly searchbar = new SearchBar(this.page.getByTestId('SearchOperations'), 'Operations')
  readonly noSearchResultsPlaceholder = new Placeholder(this.page.getByTestId('NoSearchResultsPlaceholder'), 'No search results')

  constructor(private readonly page: Page) { }

  getTagButton(tagName?: string): TagButton {
    if (tagName) {
      return new TagButton(this.page.getByTestId('TagAccordionButton').filter({ hasText: tagName }), tagName)
    } else {
      return new TagButton(this.page.getByTestId('TagAccordionButton'))
    }
  }

  getOperationButton(props?: GetOperationParams): OperationButton {
    if (props) {
      return new OperationButton(this.page.getByTestId('OperationButton').filter({ hasText: `${props.title}${props.method.toUpperCase()}` }).first(),
        `${props.title} ${props.method.toUpperCase()}`)
    } else {
      return new OperationButton(this.page.getByTestId('OperationButton'))
    }
  }
}
