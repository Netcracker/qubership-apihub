import { type Page } from '@playwright/test'
import { Backdrop, Snackbar } from '@shared/components/base'
import { MainPageHeader } from '@shared/components/custom'
import { BasePage } from './BasePage'

export abstract class MainPage extends BasePage {

  readonly snackbar = new Snackbar(this.page)
  readonly backdrop = new Backdrop(this.page.locator('.MuiBackdrop-root').last())
  readonly header = new MainPageHeader(this.page)

  protected constructor(protected readonly page: Page) {
    super(page)
  }
}
