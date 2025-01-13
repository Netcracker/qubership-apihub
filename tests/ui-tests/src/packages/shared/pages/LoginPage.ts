/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
