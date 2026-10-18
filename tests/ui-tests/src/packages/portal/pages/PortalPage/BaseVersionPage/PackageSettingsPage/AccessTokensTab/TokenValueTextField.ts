import type { Page } from '@playwright/test'
import { Button, TextField } from '@shared/components/base'

export class TokenValueTextField extends TextField {

  readonly copyBtn = new Button(this.rootLocator.getByTestId('CopyIcon'), 'Copy')

  constructor(page: Page) {
    super(page.getByTestId('AccessTokenTextField'), 'Access token')
  }
}
