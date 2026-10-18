import { expect, test, type Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseDialog } from './BaseDialog'

export abstract class BaseCancelDialog extends BaseDialog {

  readonly cancelBtn = new Button(this.rootLocator.getByTestId('CancelButton')
    .or(this.rootLocator.getByRole('button', { name: 'Cancel' })), 'Cancel')

  protected constructor(page: Page) {
    super(page)
  }

  /** @deprecated */
  async selectOption(optionName: string): Promise<void> {
    await test.step(`Select "${optionName}" option`, async () => {
      await this.page.getByRole('option', { name: optionName, exact: true }).click()
    })
  }

  /** @deprecated */
  async isOptionDisplayed(optionName: string): Promise<void> {
    await test.step(`"${optionName}" option is displayed`, async () => {
      await expect(this.page.getByRole('option', { name: optionName, exact: true })).toBeVisible()
    })
  }
}
