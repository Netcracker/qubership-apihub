import { type Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BasePublishDialog } from '@shared/components/custom'

export class EditVersionDialog extends BasePublishDialog {

  readonly saveBtn = new Button(this.rootLocator.getByTestId('SaveButton'), 'Save')

  constructor(page: Page) {
    super(page)
  }
}
