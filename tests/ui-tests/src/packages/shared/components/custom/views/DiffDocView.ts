import type { Page } from '@playwright/test'
import { BaseComponent } from '@shared/components/base'

export class DiffDocView extends BaseComponent {

  constructor(readonly page: Page) {
    super(page.locator('diff-operation-view').or(page.locator('operation-view')), 'Diff Doc view')
  }
}
