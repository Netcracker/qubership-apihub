import { test } from '@fixtures'
import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseCancelDialog } from './BaseCancelDialog'

export class BaseDeleteDialog extends BaseCancelDialog {

  readonly deleteBtn = new Button(this.rootLocator.getByTestId('DeleteButton')
    .or(this.rootLocator.getByRole('button', { name: 'Delete' })), 'Delete')

  constructor(page: Page) {
    super(page)
  }

  async clickDelete(): Promise<void> {
    await test.step('Click \'Delete\' button', async () => {
      await this.deleteBtn.click()
    })
  }
}
