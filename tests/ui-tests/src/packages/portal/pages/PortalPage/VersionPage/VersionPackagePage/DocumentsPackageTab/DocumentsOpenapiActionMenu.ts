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
import { ListItem } from '@shared/components/base'
import { OpenapiDownloadMenu } from '../../OpenapiDownloadMenu'

export class DocumentsOpenapiActionMenu extends OpenapiDownloadMenu {

  readonly componentType: string = 'action menu'

  readonly previewDocItm = new ListItem(this.page.getByTestId('PreviewDocumentMenuItem'), 'Preview document')
  readonly downloadZipItm = new ListItem(this.page.getByTestId('DownloadZipMenuItem'), 'Download (zip)')
  readonly shareSourceLinkItm = new ListItem(this.page.getByTestId('ShareSourceLinkMenuItem'), 'Public link to source')
  readonly shareDocPageItm = new ListItem(this.page.getByTestId('ShareDocumentLinkMenuItem'), 'Link to document page')
  readonly sharePageTemplateItm = new ListItem(this.page.getByTestId('ShareTemplateMenuItem'), 'Page template')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }

  async shareSourceLink(): Promise<string> {
    let str = ''
    await report.step('Get public link to source', async () => {
      await this.shareSourceLinkItm.click()
      await this.page.waitForTimeout(2000)
      str = await this.mainLocator.evaluate('navigator.clipboard.readText()')
    })
    return str
  }

  async shareDocPageLink(): Promise<string> {
    let str = ''
    await report.step('Get link to the document', async () => {
      await this.shareDocPageItm.click()
      await this.page.waitForTimeout(2000)
      str = await this.mainLocator.evaluate('navigator.clipboard.readText()')
    })
    return str
  }

  async sharePageTemplate(): Promise<string> {
    let str = ''
    await report.step('Get link to the page template', async () => {
      await this.sharePageTemplateItm.click()
      await this.page.waitForTimeout(2000)
      str = await this.mainLocator.evaluate('navigator.clipboard.readText()')
    })
    return str
  }
}
