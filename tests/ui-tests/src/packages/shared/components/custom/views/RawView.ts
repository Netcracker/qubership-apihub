import type { Page } from '@playwright/test'
import { BaseComponent, Button } from '@shared/components/base'

export class RawView extends BaseComponent {

  readonly jsonBtn = new Button(this.page.getByTestId('ModeButton-JSON'), 'JSON')
  readonly yamlBtn = new Button(this.page.getByTestId('ModeButton-YAML'), 'YAML')

  constructor(private readonly page: Page) {
    super(page.locator('.monaco-editor').and(page.getByRole('code')), 'Raw view')
  }
}
