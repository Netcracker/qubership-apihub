import type { Locator } from '@playwright/test'
import { Autocomplete, Chip, ListItem } from '@shared/components/base'

export class GsVersionStatusAutocomplete extends Autocomplete {

  readonly draftItm = new ListItem(this.page.getByTestId('DraftOption'), 'Draft')
  readonly releaseItm = new ListItem(this.page.getByTestId('ReleaseOption'), 'Release')
  readonly archivedItm = new ListItem(this.page.getByTestId('ArchivedOption'), 'Archived')
  readonly chipDraft = new Chip(this.page.getByTestId('DraftChip'), 'Draft')
  readonly chipRelease = new Chip(this.page.getByTestId('ReleaseChip'), 'Release')
  readonly chipArchived = new Chip(this.page.getByTestId('ArchivedChip'), 'Archived')

  constructor(locator: Locator) {
    super(locator.getByTestId('VersionStatusAutocomplete'), 'Version status')
  }
}
