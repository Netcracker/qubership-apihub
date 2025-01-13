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

import { expect, test, type Page } from '@playwright/test'
import { Button } from '@shared/components/base'
import { BaseDialog } from './BaseDialog'

export abstract class BaseCancelDialog extends BaseDialog {

  readonly cancelBtn = new Button(this.rootLocator.getByTestId('CancelButton')
    .or(this.rootLocator.getByRole('button', { name: 'Cancel' })), 'Cancel')

  protected constructor(page: Page) {
    super(page)
  }

  /** @deprecated */
  async selectOption(optionName: string): Promise<void> {
    await test.step(`Select "${optionName}" option`, async () => {
      await this.page.getByRole('option', { name: optionName, exact: true }).click()
    })
  }

  /** @deprecated */
  async isOptionDisplayed(optionName: string): Promise<void> {
    await test.step(`"${optionName}" option is displayed`, async () => {
      await expect(this.page.getByRole('option', { name: optionName, exact: true })).toBeVisible()
    })
  }
}
