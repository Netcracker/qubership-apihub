import type { Page } from '@playwright/test'
import { BaseComponent } from '@shared/components/base'

export class JsonSchemaView extends BaseComponent {

  constructor(page: Page) {
    super(page.getByTestId('JsonSchemaViewer'), 'JSON Schema view')
  }
}
