import type { Page } from '@playwright/test'
import { BaseComponent } from '@shared/components/base'

export class DocView extends BaseComponent {

  constructor(page: Page) {
    super(page.locator('operation-view'), 'Doc view')
  }
}
