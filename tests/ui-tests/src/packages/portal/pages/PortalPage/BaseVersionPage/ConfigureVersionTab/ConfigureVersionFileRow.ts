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

import type { Locator } from '@playwright/test'
import { Button, Icon, TableCell, TableRow } from '@shared/components/base'

export class ConfigureVersionFileRow extends TableRow {

  readonly fileCell = new TableCell(this.mainLocator.getByTestId('Cell-file-column'), this.componentName, 'filename cell')
  readonly labelsCell = new TableCell(this.mainLocator.getByTestId('Cell-labels-column'), this.componentName, 'labels cell')
  readonly infoIcon = new Icon(this.mainLocator.getByTestId('InfoOutlinedIcon'), this.componentName, 'info icon')
  readonly restoreBtn = new Button(this.mainLocator.getByTestId('RestoreButton'), this.componentName, 'restore button')
  readonly fileBtn = new Button(this.mainLocator.getByTestId('FileTitleButton'), this.componentName)
  readonly removeBtn = new Button(this.mainLocator.getByTestId('RemoveButton'), this.componentName, 'remove button')
  readonly editBtn = new Button(this.mainLocator.getByTestId('EditButton'), this.componentName, 'edit button')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'file row')
  }
}
