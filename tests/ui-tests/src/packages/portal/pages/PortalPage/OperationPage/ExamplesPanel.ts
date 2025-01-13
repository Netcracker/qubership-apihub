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

import { type Page } from 'playwright/test'
import { BaseComponent, Button, Select } from '@shared/components/base'

export class ExamplesPanel extends BaseComponent {

  readonly requestTabBtn = new Button(this.mainLocator.getByRole('tab', { name: 'Request Example' }), 'Request Example')
  readonly responseTabBtn = new Button(this.mainLocator.getByRole('tab', { name: 'Response Example' }), 'Response Example')
  readonly fullScreenBtn = new Button(this.mainLocator.getByRole('button').first(), 'Full screen')
  readonly closeFullScreenBtn = new Button(this.page.getByTestId('CloseOutlinedIcon'), 'Close Full screen')
  readonly exampleSlt = new Select(this.mainLocator.locator('.MuiInputBase-root'), 'Example')
  readonly generateBtn = new Button(this.mainLocator.getByRole('button', { name: 'Generate', exact: true }), 'Generate')

  constructor(private readonly page: Page) {
    super(page.getByTestId('ExamplesPanel'), 'Examples', 'panel')
  }

  getCodeButton(code: number): Button {
    return new Button(this.mainLocator.getByRole('button', { name: code.toString() }), code.toString())
  }
}
