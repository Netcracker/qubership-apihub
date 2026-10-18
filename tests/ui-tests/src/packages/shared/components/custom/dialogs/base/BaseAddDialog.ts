import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseCancelDialog } from './BaseCancelDialog'

export abstract class BaseAddDialog extends BaseCancelDialog {

  readonly addBtn = new Button(this.rootLocator.getByTestId('AddButton')
    .or(this.rootLocator.getByRole('button', { name: 'Add' })), 'Add')

  protected constructor(page: Page) {
    super(page)
  }
}
