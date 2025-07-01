import type { Page } from '@playwright/test'
import { BaseComponent } from '@shared/components/base'

export class DiffRawView extends BaseComponent {

  constructor(readonly page: Page) {
    super(page.locator('.monaco-diff-editor'), 'Diff Raw view')
  }
}
