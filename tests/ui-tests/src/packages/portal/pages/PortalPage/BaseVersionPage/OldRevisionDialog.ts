import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseCancelDialog } from '@shared/components/custom'

export class OldRevisionDialog extends BaseCancelDialog {

  readonly yesBtn = new Button(this.rootLocator.getByTestId('Yes, openButton'), 'Yes, open')

  constructor(page: Page) {
    super(page)
  }
}
