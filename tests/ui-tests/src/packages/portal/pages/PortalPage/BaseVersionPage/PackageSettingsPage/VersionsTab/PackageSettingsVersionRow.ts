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
import { Button, Link, TableCell, TableRow } from '@shared/components/base'
import { quoteName } from '@services/utils'

export class PackageSettingsVersionRow extends TableRow {

  readonly versionCell = new TableCell(this.mainLocator.getByTestId('Cell-version'), this.componentName, 'version cell')
  readonly versionLink = new Link(this.mainLocator.getByRole('link'), this.componentName)
  readonly statusCell = new TableCell(this.mainLocator.getByTestId('Cell-version-status'), this.componentName, 'status cell')
  readonly labelsCell = new TableCell(this.mainLocator.getByTestId('Cell-labels'), this.componentName, 'labels cell')
  readonly publicationDateCell = new TableCell(this.mainLocator.getByTestId('Cell-publication-date'), this.componentName, 'publication date cell')
  readonly publishedByCell = new TableCell(this.mainLocator.getByTestId('Cell-published-by'), this.componentName, 'published by cell')
  readonly previousVersionCell = new TableCell(this.mainLocator.getByTestId('Cell-previous-version'), this.componentName, 'previous version cell')
  readonly editBtn = new Button(this.mainLocator.getByTestId('EditButton'), this.componentName, 'edit button')
  readonly deleteBtn = new Button(this.mainLocator.getByTestId('DeleteButton'), this.componentName, 'delete button')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'version row')
  }

  async openEditVersionDialog(): Promise<void> {
    await report.step(`Open "Edit Version" dialog for ${quoteName(this.componentName)} version`, async () => {
      await this.hover()
      await this.editBtn.click()
    })
  }

  async openDeleteVersionDialog(): Promise<void> {
    await report.step(`Open "Delete Version" dialog for ${quoteName(this.componentName)} version`, async () => {
      await this.hover()
      await this.deleteBtn.click()
    })
  }
}
