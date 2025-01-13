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

import { type Locator, test as report } from '@playwright/test'
import { Button, TableCell, TableRow } from '@shared/components/base'

export class AccessTokenRow extends TableRow {

  readonly name = new TableCell(this.mainLocator.getByTestId('Cell-name'), this.componentName, 'name cell')
  readonly roles = new TableCell(this.mainLocator.getByTestId('Cell-roles'), this.componentName, 'roles cell')
  readonly createdAt = new TableCell(this.mainLocator.getByTestId('Cell-created-at'), this.componentName, 'created at cell')
  readonly createdBy = new TableCell(this.mainLocator.getByTestId('Cell-created-by'), this.componentName, 'created by cell')
  readonly createdFor = new TableCell(this.mainLocator.getByTestId('Cell-created-for'), this.componentName, 'created for cell')
  readonly deleteBtn = new Button(this.mainLocator.getByTestId('DeleteButton'), this.componentName, 'delete button')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'token row')
  }

  async deleteToken(): Promise<void> {
    await report.step(`Delete "${this.componentName}" token`, async () => {
      await this.hover()
      await this.deleteBtn.click()
    })
  }
}
