import { type Page, test } from '@playwright/test'
import { Title } from '@shared/components/base'

export abstract class BaseDialog {
  protected readonly rootLocator = this.page.getByRole('dialog')
  readonly title = new Title(this.rootLocator.getByRole('heading').first(), 'Dialog')

  protected constructor(protected readonly page: Page) {}

  async clickEmptySpace(): Promise<void> {
    await test.step('Click on an empty space in the dialog', async () => {
      await this.title.click()
    })
  }
}
