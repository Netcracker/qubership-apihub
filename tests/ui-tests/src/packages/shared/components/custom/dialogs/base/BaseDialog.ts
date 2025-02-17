import { test, type Page } from '@playwright/test'

export abstract class BaseDialog {

  protected readonly rootLocator = this.page.getByRole('dialog')
  readonly title = this.rootLocator.getByRole('heading')

  protected constructor(protected readonly page: Page) { }

  async clickEmptySpace(): Promise<void> {
    await test.step('Click on an empty space in the dialog', async () => {
      await this.title.click()
    })
  }
}
