import type { Page } from '@playwright/test'
import { BaseComponent } from '@shared/components/base'

export class DiffDocView extends BaseComponent {

  constructor(readonly page: Page) {
    super(page.getByTestId('openapi-operation-diffs-viewer'), 'Diff Doc view')
  }
}
