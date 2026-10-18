import type { Page } from '@playwright/test'
import { BaseComponent } from '@shared/components/base'

export class ApiSpecView extends BaseComponent {

  constructor(page: Page) {
    super(page.locator('apispec-view'), 'API Spec view')
  }
}
