import { test } from '@fixtures'
import type { Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseCancelDialog } from './BaseCancelDialog'

export abstract class BaseImportDialog extends BaseCancelDialog {

  readonly importBtn = new Button(this.rootLocator.getByTestId('ImportButton')
    .or(this.rootLocator.getByRole('button', { name: 'Import' })), 'Import')

  protected constructor(protected readonly page: Page) {
    super(page)
  }

  /** @deprecated */
  async clickImport(): Promise<void> {
    await test.step('Click \'Import\' button', async () => {
      await this.importBtn.click()
    })
  }
}
