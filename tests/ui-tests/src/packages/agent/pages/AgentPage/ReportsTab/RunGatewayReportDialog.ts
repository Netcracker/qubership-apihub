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
