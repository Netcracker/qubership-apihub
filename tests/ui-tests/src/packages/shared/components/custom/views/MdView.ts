import type { Page } from '@playwright/test'
import { BaseComponent } from '@shared/components/base'

export class MdView extends BaseComponent {

  constructor(page: Page) {
    super(page.locator('.markdown-body'), 'MARKDOWN view')
  }
}
