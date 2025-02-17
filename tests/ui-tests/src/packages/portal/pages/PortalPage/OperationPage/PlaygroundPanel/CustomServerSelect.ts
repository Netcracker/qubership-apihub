import { Button, Select } from '@shared/components/base'
import { type Page } from 'playwright/test'

export class CustomServerSelect extends Select {

  readonly addCustomServerBtn = new Button(this.page.getByRole('option', { name: 'Add Custom Server' }), 'Add Custom Server')

  constructor(page: Page) {
    super(page.getByTestId('PlaygroundPanel').locator('.MuiInputBase-root'), 'Custom Server')
  }
}
