import type { Page } from '@playwright/test'
import { Button, TextField } from '@shared/components/base'
import { BaseCancelDialog } from '@shared/components/custom'

export class RunGatewayReportDialog extends BaseCancelDialog {

  readonly runReportBtn = new Button(this.rootLocator.getByTestId('RunReportButton'), 'Run Report')
  readonly idpUrlTxtFld = new TextField(this.rootLocator.getByTestId('IdpUrlTextField'), 'Identity Provider URL')
  readonly usernameTxtFld = new TextField(this.rootLocator.getByTestId('UsernameTextField'), 'Username')
  readonly passwordTxtFld = new TextField(this.rootLocator.getByTestId('PasswordTextField'), 'Password')

  constructor(page: Page) {
    super(page)
  }

  async fillForm(params: Partial<{
    idpUrl: string
    username: string
    password: string
  }>): Promise<void> {
    params.idpUrl && await this.idpUrlTxtFld.fill(params.idpUrl)
    params.username && await this.usernameTxtFld.fill(params.username)
    params.password && await this.passwordTxtFld.fill(params.password)
  }
}
