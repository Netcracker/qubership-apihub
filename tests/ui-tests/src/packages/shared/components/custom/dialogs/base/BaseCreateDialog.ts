import { test } from '@fixtures'
import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseCancelDialog } from './BaseCancelDialog'

export abstract class BaseCreateDialog extends BaseCancelDialog {

  readonly createBtn = new Button(this.rootLocator.getByTestId('CreateButton')
    .or(this.rootLocator.getByRole('button', { name: 'Create' })), 'Create')

  protected constructor(page: Page) {
    super(page)
  }

  /** @deprecated */
  async clickCreate(): Promise<void> {
    await test.step('Click \'Create\' button', async () => {
      await this.createBtn.mainLocator.click()
    })
  }
}
