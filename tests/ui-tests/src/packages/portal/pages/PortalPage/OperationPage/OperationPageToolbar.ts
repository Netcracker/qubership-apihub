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
import { Breadcrumbs, Button, Title } from '@shared/components/base'
import { CompareMenu } from '@portal/components'
import { OperationSelect } from './OperationPageToolbar/OperationSelect'

export class OperationPageToolbar {

  private readonly locator = this.page.getByTestId('MainPageCardHeader')
    .or(this.page.locator('.MuiCardHeader-root')) // TODO Add 'MainPageCardHeader' in APIHUBUI
  readonly breadcrumbs = new Breadcrumbs(this.locator.getByTestId('PackageBreadcrumbs'), 'Operation')
  readonly backBtn = new Button(this.locator.getByTestId('BackButton'), 'Back')
  readonly title = new Title(this.locator.getByTestId('ToolbarTitleTypography'), 'Package')
  readonly operationSlt = new OperationSelect(this.locator)
  readonly docBtn = new Button(this.locator.getByTestId('ModeButton-doc'), 'Doc')
  readonly simpleBtn = new Button(this.locator.getByTestId('ModeButton-simple'), 'Simple')
  readonly graphBtn = new Button(this.locator.getByTestId('ModeButton-graph'), 'Graph')
  readonly rawBtn = new Button(this.locator.getByTestId('ModeButton-raw'), 'Raw')
  readonly compareMenu = new CompareMenu(this.locator.page())
  readonly playgroundBtn = new Button(this.locator.locator('button[value=playground]'), 'Playground')
  readonly examplesBtn = new Button(this.locator.locator('button[value=examples]'), 'Examples')

  constructor(private readonly page: Page) { }
}
