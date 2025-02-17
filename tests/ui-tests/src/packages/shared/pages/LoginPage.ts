import { type Page } from '@playwright/test'
import type { Credentials, GotoOptions } from '@shared/entities'
import { BasePage } from './BasePage'
import { Button, TextField, Title } from '@shared/components/base'

export class LoginPage extends BasePage {

  readonly loginFormTitle = new Title(this.page.getByTestId('ApihubLoginHeaderTypography'), 'APIHUB Login')
  readonly loginTxtFld = new TextField(this.page.getByTestId('LoginTextInput'), 'Login')
  readonly passwordTxtFld = new TextField(this.page.getByTestId('PasswordTextInput'), 'Password')
  readonly signInBtn = new Button(this.page.getByTestId('SignInButton'), 'Log in')
  readonly ssoSignInBtn = new Button(this.page.getByTestId('SSOSignInButton'), 'SSO Log in')
  readonly errorAlert = this.page.getByRole('alert')
  readonly errorIcon = this.page.getByTestId('ErrorOutlineIcon')

  constructor(protected readonly page: Page) {
    super(page)
  }

  async goto(url?: string, options?: GotoOptions): Promise<void> {
    if (url) {
      await super.goto(url, options)
    } else {
      await this.navigationStep('Go to the "Login" page', '/login')
    }
  }

  async signIn(credentials: Credentials): Promise<void> {
    await this.loginTxtFld.fill(credentials.email)
    await this.passwordTxtFld.fill(credentials.password)
    await this.signInBtn.click()
    await this.page.waitForLoadState('networkidle')
  }
}
