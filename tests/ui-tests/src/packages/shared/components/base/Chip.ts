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

import { type Locator, test as setup } from '@playwright/test'
import { BaseComponent } from './BaseComponent'
import { Button } from './buttons/Button'

export class Chip extends BaseComponent {

  private readonly removeBtn = new Button(this.mainLocator.getByTestId('CancelIcon').or(this.mainLocator.getByTestId('CloseOutlinedIcon')), 'Remove')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'chip')
  }

  async remove(): Promise<void> {
    await setup.step(`Remove "${this.componentName}" ${this.componentType}`, async () => {
      await this.hover()
      await this.removeBtn.click()
    }, { box: true })
  }
}
