import { expect, test, type Page } from '@playwright/test'
import { BaseComponent, Button, Link } from '@shared/components/base'

export class Snackbar extends BaseComponent {

  readonly closeBtn = new Button(this.mainLocator.getByTestId('CloseOutlinedIcon'), 'Close')
  readonly checkItOutLink = new Link(this.mainLocator.getByRole('link', { name: 'Check it out' }), 'Check it out')
  readonly undoBtn = new Button(this.mainLocator.getByRole('button', { name: 'Undo' }), 'Undo')

  /** @deprecated */
  private readonly any = this.page.getByRole('alert')
  /** @deprecated */
  private readonly success = this.any.getByTestId('SuccessIcon')
  /** @deprecated */
  private readonly info = this.any.getByTestId('InfoIcon')

  constructor(private readonly page: Page) {
    super(page.getByTestId('Snackbar'), '', 'snackbar')
  }

  /** @deprecated */
  async isAppeared(): Promise<void> {
    await test.step('\'Notification\' is appeared', async () => {
      await expect(this.any).toBeVisible()
    })
  }

  /** @deprecated */
  async isSuccess(): Promise<void> {
    await test.step('\'Success notification\' is appeared', async () => {
      await expect(this.success).toBeVisible()
    })
  }

  /** @deprecated */
  async isInfo(): Promise<void> {
    await test.step('\'Info notification\' is appeared', async () => {
      await expect(this.info).toBeVisible()
    })
  }
}
