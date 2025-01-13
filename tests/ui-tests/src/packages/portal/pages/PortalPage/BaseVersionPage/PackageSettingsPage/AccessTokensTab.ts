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

import { type Page, test as report } from '@playwright/test'
import { BaseSettingsTab } from './BaseSettingsTab'
import { Autocomplete, Button, TextField } from '@shared/components/base'
import { TokenValueTextField } from './AccessTokensTab/TokenValueTextField'
import { AccessTokenRow } from './AccessTokensTab/AccessTokenRow'
import { nthPostfix } from '@services/utils'

export class AccessTokensTab extends BaseSettingsTab {

  readonly nameTxtFld = new TextField(this.page.getByTestId('NameTextField'), 'Name')
  readonly rolesAc = new Autocomplete(this.page.getByTestId('RolesAutocomplete'), 'Roles')
  readonly createdForAc = new Autocomplete(this.page.getByTestId('CreatedForAutocomplete'), 'Created For')
  readonly generateBtn = new Button(this.page.getByTestId('GenerateButton'), 'Generate')
  readonly tokenValueTxtFld = new TokenValueTextField(this.page)
  readonly tokenWarning = new Button(this.page.getByTestId('TokenWarning'), 'Token Warning')

  constructor(page: Page) {
    super(page.getByTestId('TabButton-tokens'), 'Access Tokens')
  }

  getTokenRow(tokenName?: string): AccessTokenRow
  getTokenRow(nth?: number): AccessTokenRow
  getTokenRow(tokenName?: string, nth?: number): AccessTokenRow
  getTokenRow(tokenNameOrNth?: string | number, nth?: number): AccessTokenRow {
    if (typeof tokenNameOrNth === 'string' && !nth) {
      return new AccessTokenRow(this.page.getByRole('cell', {
        name: tokenNameOrNth,
        exact: true,
      }).locator('..'), tokenNameOrNth)
    }
    if (typeof tokenNameOrNth === 'number') {
      return new AccessTokenRow(this.page.getByTestId('Cell-name').nth(tokenNameOrNth - 1).locator('..'), '', `${tokenNameOrNth}${nthPostfix(tokenNameOrNth)} token row`)
    }
    if (!tokenNameOrNth && !nth) {
      return new AccessTokenRow(this.page.getByTestId('Cell-name').locator('..'))
    }
    if (tokenNameOrNth && nth) {
      return new AccessTokenRow(this.page.getByRole('cell', {
          name: tokenNameOrNth,
          exact: true,
        }).locator('..').nth(nth - 1),
        tokenNameOrNth,
        `${nth}${nthPostfix(nth)} token row`)
    }
    throw new Error('Check arguments')
  }

  async copyToken(): Promise<string> {
    let str = ''
    await this.tokenValueTxtFld.copyBtn.click()
    await report.step('Get token from the clipboard', async () => {
      await this.page.waitForTimeout(2000)
      str = await this.mainLocator.evaluate('navigator.clipboard.readText()')
    })
    return str
  }
}
