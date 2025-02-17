import type { Page } from '@playwright/test'
import { Autocomplete, TextField } from '@shared/components/base'
import { BaseAddDialog } from '@shared/components/custom'

export class AddCustomServerDialog extends BaseAddDialog {

  readonly cloudAc = new Autocomplete(this.rootLocator.getByTestId('CloudAutocomplete'), 'Cloud')
  readonly namespaceAc = new Autocomplete(this.rootLocator.getByTestId('NamespaceAutocomplete'), 'Namespace')
  readonly serviceAc = new Autocomplete(this.rootLocator.getByTestId('ServiceAutocomplete'), 'Service')
  readonly urlTxtFld = new TextField(this.rootLocator.getByTestId('ServerUrlTextInput'), 'Server URL')

  constructor(page: Page) {
    super(page)
  }
}
