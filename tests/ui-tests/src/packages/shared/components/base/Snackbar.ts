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
import { BaseComponent, Button, Link } from '@shared/components/base'

export class Snackbar extends BaseComponent {

  readonly closeBtn = new Button(this.mainLocator.getByTestId('CloseOutlinedIcon'), 'Close')
  readonly checkItOutLink = new Link(this.mainLocator.getByRole('link', { name: 'Check it out' }), 'Check it out')
  readonly undoBtn = new Button(this.mainLocator.getByRole('button', { name: 'Undo' }), 'Undo')

  /** @deprecated */
  private readonly any = this.page.getByRole('alert')
  /** @deprecated */
  private readonly success = this.any.getByTestId('SuccessIcon')
  /** @deprecated */
  private readonly info = this.any.getByTestId('InfoIcon')

  constructor(private readonly page: Page) {
    super(page.getByTestId('Snackbar'), '', 'snackbar')
  }

  /** @deprecated */
  async isAppeared(): Promise<void> {
    await test.step('\'Notification\' is appeared', async () => {
      await expect(this.any).toBeVisible()
    })
  }

  /** @deprecated */
  async isSuccess(): Promise<void> {
    await test.step('\'Success notification\' is appeared', async () => {
      await expect(this.success).toBeVisible()
    })
  }

  /** @deprecated */
  async isInfo(): Promise<void> {
    await test.step('\'Info notification\' is appeared', async () => {
      await expect(this.info).toBeVisible()
    })
  }
}
