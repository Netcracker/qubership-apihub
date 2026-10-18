import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseCancelDialog } from '@shared/components/custom'

export class DeleteVersionDialog extends BaseCancelDialog {

  readonly deleteBtn = new Button(this.rootLocator.getByTestId('Yes, deleteButton'), 'Delete')

  constructor(page: Page) {
    super(page)
  }
}
