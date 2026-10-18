import { type Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseCancelDialog } from './BaseCancelDialog'

export class BaseRemoveDialog extends BaseCancelDialog {

  readonly removeBtn = new Button(this.rootLocator.getByTestId('RemoveButton')
    .or(this.rootLocator.getByRole('button', { name: 'Remove' })), 'Remove')

  constructor(page: Page) {
    super(page)
  }
}
