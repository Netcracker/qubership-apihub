import type { Page } from '@playwright/test'
import { BaseComponent } from '@shared/components/base'

export class GraphView extends BaseComponent {

  constructor(page: Page) {
    super(page.locator('class-view'), 'Graph view')
  }
}
