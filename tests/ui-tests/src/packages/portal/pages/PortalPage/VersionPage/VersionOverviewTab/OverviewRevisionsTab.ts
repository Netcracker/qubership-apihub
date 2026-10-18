import type { Locator } from '@playwright/test'
import { SearchBar, Tab } from '@shared/components/base'
import { OverviewRevisionRow } from './OverviewRevisionsTab/OverviewRevisionRow'

export class OverviewRevisionsTab extends Tab {

  readonly searchbar = new SearchBar(this.rootLocator.getByTestId('SearchRevisions'), 'Revisions')

  constructor(readonly rootLocator: Locator) {
    super(rootLocator.getByTestId('RevisionsButton'), 'Revisions')
  }

  getRevisionRow(revision?: string): OverviewRevisionRow {
    const pattern = new RegExp(`${revision}\\s?.*`)
    if (!revision) {
      return new OverviewRevisionRow(this.rootLocator.getByTestId('Cell-version'))
    }
    return new OverviewRevisionRow(this.rootLocator.getByRole('cell', { name: pattern }).locator('..'), revision)
  }
}
