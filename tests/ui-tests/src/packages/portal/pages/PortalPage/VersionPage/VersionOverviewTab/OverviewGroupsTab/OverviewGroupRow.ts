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
import { type BaseComponent, Button, TableCell, TableRow } from '@shared/components/base'
import { GroupDownloadMenu } from './OverviewGroupRow/GroupDownloadMenu'
import { test as report } from 'playwright/test'
import type { DownloadedTestFile } from '@shared/entities'
import { GroupNameCell } from './OverviewGroupRow/GroupNameCell'
import { getDownloadedFile } from '@services/utils'

export class OverviewGroupRow extends TableRow {

  readonly nameCell = new GroupNameCell(this.mainLocator, this.componentName)
  readonly groupTypeCell = new TableCell(this.mainLocator.getByTestId('Cell-group-type'), this.componentName, 'group type cell')
  readonly descriptionCell = new TableCell(this.mainLocator.getByTestId('Cell-description'), this.componentName, 'description cell')
  readonly apiTypeCell = new TableCell(this.mainLocator.getByTestId('Cell-api-type'), this.componentName, 'API type cell')
  readonly operationsNumberCell = new TableCell(this.mainLocator.getByTestId('Cell-operations-number'), this.componentName, 'operations number cell')
  readonly addBtn = new Button(this.mainLocator.getByTestId('AddButton'), this.componentName, 'add button')
  readonly editBtn = new Button(this.mainLocator.getByTestId('EditButton'), this.componentName, 'edit button')
  readonly deleteBtn = new Button(this.mainLocator.getByTestId('DeleteButton'), this.componentName, 'delete button')
  readonly downloadMenu = new GroupDownloadMenu(this.mainLocator)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'group row')
  }

  async openEditGroupDialog(): Promise<void> {
    await report.step(`Open "Edit group" dialog for the "${this.componentName}" group`, async () => {
      await this.hover()
      await this.addBtn.click()
    })
  }

  async openEditGroupParametersDialog(): Promise<void> {
    await report.step(`Open "Edit group parameters" dialog for the "${this.componentName}" group`, async () => {
      await this.hover()
      await this.editBtn.click()
    })
  }

  async openDeleteGroupDialog(): Promise<void> {
    await report.step(`Open "Delete group" dialog for the "${this.componentName}" group`, async () => {
      await this.hover()
      await this.deleteBtn.click()
    })
  }

  async downloadCombinedYaml(): Promise<DownloadedTestFile> {
    return await this.hoverableDownload(this.mainLocator, 'Download combined YAML', this.downloadMenu, this.downloadMenu.combinedYamlItm)
  }

  async downloadCombinedJson(): Promise<DownloadedTestFile> {
    return await this.hoverableDownload(this.mainLocator, 'Download combined JSON', this.downloadMenu, this.downloadMenu.combinedJsonItm)
  }

  async downloadReducedYaml(): Promise<DownloadedTestFile> {
    return await this.hoverableDownload(this.mainLocator, 'Download reduced YAML', this.downloadMenu, this.downloadMenu.reducedYamlItm)
  }

  async downloadReducedJson(): Promise<DownloadedTestFile> {
    return await this.hoverableDownload(this.mainLocator, 'Download reduced JSON', this.downloadMenu, this.downloadMenu.reducedJsonItm)
  }

  async downloadReducedHtml(): Promise<DownloadedTestFile> {
    return await this.hoverableDownload(this.mainLocator, 'Download reduced HTML', this.downloadMenu, this.downloadMenu.reducedHtmlItm)
  }

  //TODO: need to move to shared functions
  private async hoverableDownload(hoverableElement: Locator, stepTitle: string, menu: BaseComponent, menuElement: BaseComponent): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step(stepTitle, async () => {
      const downloadPromise = hoverableElement.page().waitForEvent('download')
      await hoverableElement.hover()
      await menu.click()
      await menuElement.click({ position: { x: 1, y: 1 } }) //WA: tooltip handling
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }
}
