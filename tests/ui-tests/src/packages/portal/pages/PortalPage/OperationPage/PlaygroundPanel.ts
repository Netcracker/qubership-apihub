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

import { BaseComponent, Button, TextField } from '@shared/components/base'
import { type Page } from 'playwright/test'
import { AddCustomServerDialog } from './PlaygroundPanel/AddCustomServerDialog'
import { CustomServerSelect } from './PlaygroundPanel/CustomServerSelect'

export class PlaygroundPanel extends BaseComponent {

  readonly serverSlt = new CustomServerSelect(this.page)
  readonly sendBtn = new Button(this.mainLocator.getByRole('button', { name: 'Send' }), 'Send')
  readonly tokenTxtFld = new TextField(this.mainLocator.locator('label:has-text("Token")+span+div'), 'Token')
  readonly textFilterTxtFld = new TextField(this.mainLocator.locator('label:has-text("textFilter")+span+div'), 'textFilter')
  readonly typesTxtFld = new TextField(this.mainLocator.locator('label:has-text("types")+span+div'), 'textFilter')
  readonly addServerDialog = new AddCustomServerDialog(this.page)

  constructor(private readonly page: Page) {
    super(page.getByTestId('PlaygroundPanel'), 'Playground', 'panel')
  }
}
