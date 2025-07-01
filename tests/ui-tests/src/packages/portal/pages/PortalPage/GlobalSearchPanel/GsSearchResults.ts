import type { Locator } from '@playwright/test'
import { Placeholder } from '@shared/components/base'
import { GsSearchResultRow } from './GsSearchResults/GsSearchResultRow'

export class GsSearchResults {

  readonly phNoOperations = new Placeholder(this.locator.getByTestId('NoOperationsPlaceholder'), 'No Operations')
  readonly phNoDocuments = new Placeholder(this.locator.getByTestId('NoDocumentsPlaceholder'), 'No Documents')
  readonly phNoPackages = new Placeholder(this.locator.getByTestId('NoPackagesPlaceholder'), 'No Packages')

  constructor(readonly locator: Locator) { }

  searchResultRow(
    searchResult?: { title: string },
    nth?: number,
  ): GsSearchResultRow {
    if (searchResult && nth) {
      return new GsSearchResultRow(this.locator
          .getByTestId('SearchResultRow')
          .filter({ has: this.locator.page().getByRole('link', { name: searchResult.title, exact: true }) })
          .nth(nth - 1),
        `${searchResult.title} #${nth}`)
    }
    if (searchResult) {
      return new GsSearchResultRow(this.locator
          .getByTestId('SearchResultRow')
          .filter({ has: this.locator.page().getByRole('link', { name: searchResult.title, exact: true }) }),
        searchResult.title)
    }
    if (nth) {
      return new GsSearchResultRow(this.locator.getByTestId('SearchResultRow').nth(nth - 1),
        `#${nth}`)
    }
    return new GsSearchResultRow(this.locator.getByTestId('SearchResultRow'))
  }
}
