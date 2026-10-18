import type { Page } from '@playwright/test'
import { Checkbox, Content, TextField } from '@shared/components/base'
import { BaseSaveDialog } from '@shared/components/custom'

export class EditRestGroupingPrefixDialog extends BaseSaveDialog {

  readonly prefixTxtFld = new TextField(this.rootLocator.getByTestId('PrefixTextField'), 'Grouping prefix')
  readonly recalculateChx = new Checkbox(this.rootLocator.getByTestId('RecalculateCheckbox'), 'Recalculate groups')
  readonly errorMsg = new Content(this.prefixTxtFld.rootLocator, 'Error') //Impossible to add a precision test ID in the APIHUBUI

  constructor(page: Page) {
    super(page)
  }
}
