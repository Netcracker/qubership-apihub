import type { Page } from '@playwright/test'
import { Autocomplete, ListItem } from '@shared/components/base'

export class VersionStatusAutocomplete extends Autocomplete {

  readonly draftItm = new ListItem(this.mainLocator.page().getByTestId('Option-draft'), 'draft')
  readonly releaseItm = new ListItem(this.mainLocator.page().getByTestId('Option-release'), 'release')
  readonly archivedItm = new ListItem(this.mainLocator.page().getByTestId('Option-archived'), 'archived')

  constructor(page: Page) {
    super(page.getByTestId('StatusAutocomplete'), 'Status')
  }
}
