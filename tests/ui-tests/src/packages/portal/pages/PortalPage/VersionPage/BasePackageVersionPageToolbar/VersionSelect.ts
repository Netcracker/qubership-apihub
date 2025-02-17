import type { Page } from '@playwright/test'
import { BaseComponent, Button, SearchBar } from '@shared/components/base'
import { VersionSelectTableRow } from './VersionSelect/VersionSelectTableRow'

export class VersionSelect extends BaseComponent {
  private content = this.page.getByRole('menu')
  readonly releaseBtn = new Button(this.content.getByTestId('ReleaseButton'), 'Release')
  readonly draftBtn = new Button(this.content.getByTestId('DraftButton'), 'Draft')
  readonly archivedBtn = new Button(this.content.getByTestId('ArchivedButton'), 'Archived')
  readonly searchbar = new SearchBar(this.content.getByTestId('VersionSearchBar'), 'Version')
  readonly createVersionBtn = new Button(this.content.getByTestId('CreateVersionButton'), 'Create version')

  constructor(private readonly page: Page) {
    super(page.getByTestId('VersionSelector'), 'Version', 'select')
  }

  getVersionRow(version?: string): VersionSelectTableRow {
    if (version) {
      return new VersionSelectTableRow(this.content.getByRole('cell', { name: version, exact: true }).locator('..'), version)
    } else {
      return new VersionSelectTableRow(this.content.locator('tbody').locator('tr'))
    }
  }
}
