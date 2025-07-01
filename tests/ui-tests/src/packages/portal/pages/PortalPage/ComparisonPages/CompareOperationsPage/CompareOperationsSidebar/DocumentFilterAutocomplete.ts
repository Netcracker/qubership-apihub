import type { Page } from '@playwright/test'
import { Autocomplete } from '@shared/components/base'

export class DocumentFilterAutocomplete extends Autocomplete {

  constructor(readonly page: Page) {
    super(page.getByTestId('DocumentFilter'), 'Document Filter')
  }
}
