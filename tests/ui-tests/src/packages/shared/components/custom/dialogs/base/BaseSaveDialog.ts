import { test } from '@fixtures'
import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseCancelDialog } from './BaseCancelDialog'

export abstract class BaseSaveDialog extends BaseCancelDialog {

  readonly saveBtn = new Button(this.rootLocator.getByTestId('SaveButton')
    .or(this.rootLocator.getByRole('button', { name: 'Save' })), 'Save')

  protected constructor(page: Page) {
    super(page)
  }

  /** @deprecated */
  async clickSave(): Promise<void> {
    await test.step('Click \'Save\'', async () => {
      await this.saveBtn.click()
    })
  }
}
