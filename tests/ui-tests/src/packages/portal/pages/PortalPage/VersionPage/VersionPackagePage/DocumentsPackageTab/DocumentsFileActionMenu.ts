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
import type { DownloadedTestFile } from '@shared/entities/files'
import { DropdownMenu, ListItem } from '@shared/components/base'
import { getDownloadedFile } from '@services/utils'

export class DocumentsFileActionMenu extends DropdownMenu {

  readonly downloadItm = new ListItem(this.page.getByTestId('DownloadMenuItem'), 'HTML interactive')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'action menu')
  }

  async download(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download source', async () => {
      const downloadPromise = this.page.waitForEvent('download')
      await this.downloadItm.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }
}
