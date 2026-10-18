import { type Page } from 'playwright/test'
import { BaseComponent, Button, Select } from '@shared/components/base'

export class ExamplesPanel extends BaseComponent {

  readonly requestTabBtn = new Button(this.mainLocator.getByRole('tab', { name: 'Request Example' }), 'Request Example')
  readonly responseTabBtn = new Button(this.mainLocator.getByRole('tab', { name: 'Response Example' }), 'Response Example')
  readonly fullScreenBtn = new Button(this.mainLocator.getByRole('button').first(), 'Full screen')
  readonly closeFullScreenBtn = new Button(this.page.getByTestId('CloseOutlinedIcon'), 'Close Full screen')
  readonly exampleSlt = new Select(this.mainLocator.locator('.MuiInputBase-root'), 'Example')
  readonly generateBtn = new Button(this.mainLocator.getByRole('button', { name: 'Generate', exact: true }), 'Generate')

  constructor(private readonly page: Page) {
    super(page.getByTestId('ExamplesPanel'), 'Examples', 'panel')
  }

  getCodeButton(code: number): Button {
    return new Button(this.mainLocator.getByRole('button', { name: code.toString() }), code.toString())
  }
}
