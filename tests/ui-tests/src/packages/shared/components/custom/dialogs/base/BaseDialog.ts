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

import { test, type Page } from '@playwright/test'

export abstract class BaseDialog {

  protected readonly rootLocator = this.page.getByRole('dialog')
  readonly title = this.rootLocator.getByRole('heading')

  protected constructor(protected readonly page: Page) { }

  async clickEmptySpace(): Promise<void> {
    await test.step('Click on an empty space in the dialog', async () => {
      await this.title.click()
    })
  }
}
