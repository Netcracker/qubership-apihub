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
import { BaseComponent, Content, SearchBar } from '@shared/components/base'
import { BaseSaveDialog } from '@shared/components/custom'
import { OperationsTabSidebar } from '@portal/components'
import { OperationGroupDialogList } from './EditOperationGroupDialog/OperationGroupDialogList'
import { ExchangeButton } from './EditOperationGroupDialog/ExchangeButton'

export class EditOperationGroupDialog extends BaseSaveDialog {

  readonly searchbar = new SearchBar(this.rootLocator.getByTestId('SearchOperations'), 'Operations')
  readonly sidebar = new OperationsTabSidebar(this.rootLocator)
  readonly leftList = new OperationGroupDialogList(this.rootLocator.getByTestId('LeftList'), 'Left')
  readonly rightList = new OperationGroupDialogList(this.rootLocator.getByTestId('RightList'), 'Right')
  readonly toLeftBtn = new ExchangeButton(this.rootLocator.getByTestId('ToLeftButton'), 'To Left')
  readonly toRightBtn = new ExchangeButton(this.rootLocator.getByTestId('ToRightButton'), 'To Right')
  readonly operationGroupLimit = new Content(this.rootLocator.getByTestId('OperationGroupLimit'), 'Operation Group Limit')
  readonly tooltip = new BaseComponent(this.rootLocator.page().getByRole('tooltip'), 'tooltip')

  constructor(page: Page) {
    super(page)
  }
}
