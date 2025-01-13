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

import type { DownloadedTestFile } from '@shared/entities/files'
import { type Page, test as report } from '@playwright/test'
import { DropdownMenu, ListItem } from '@shared/components/base'
import { getDownloadedFile } from '@services/utils'

export class PackageTabExportMenu extends DropdownMenu {

  readonly allItm = new ListItem(this.mainLocator.page().getByTestId('DownloadAllMenuItem'), 'All items')
  readonly filteredItm = new ListItem(this.mainLocator.page().getByTestId('DownloadFilteredMenuItem'), 'Filtered items')

  constructor(page: Page) {
    super(page.getByTestId('ExportMenuButton'), 'Export')
  }

  async downloadAll(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download All items', async () => {
      const downloadPromise = this.mainLocator.page().waitForEvent('download')
      await this.mainLocator.click()
      await this.allItm.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }

  async downloadFiltered(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download Filtered items', async () => {
      const downloadPromise = this.mainLocator.page().waitForEvent('download')
      await this.mainLocator.click()
      await this.filteredItm.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }
}
