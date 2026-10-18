import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseCancelDialog } from '@shared/components/custom'

export class ActivateRulesetDialog extends BaseCancelDialog {
  readonly proceedBtn = new Button(this.rootLocator.getByTestId('ProceedButton'), 'Proceed')

  constructor(page: Page) {
    super(page)
  }
}
