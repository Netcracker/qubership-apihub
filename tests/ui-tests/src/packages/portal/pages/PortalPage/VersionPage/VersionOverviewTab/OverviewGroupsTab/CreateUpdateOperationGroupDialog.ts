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

import { BaseCreateDialog } from '@shared/components/custom'
import { type Page, test as report } from '@playwright/test'
import {
  type DownloadedTestFile,
  GRAPHQL_API_TYPE,
  type OperationsApiType,
  REST_API_TYPE,
  type TestFile,
} from '@shared/entities'
import { Button, FilesUploader, Icon, TextField } from '@shared/components/base'
import { ApiTypeAutocomplete } from '@portal/components'
import {
  DownloadableFilePreview,
  NotDownloadableFilePreview,
} from './CreateUpdateOperationGroupDialog/UploadedFilePreview'
import { getDownloadedFile } from '@services/utils'

export class CreateUpdateOperationGroupDialog extends BaseCreateDialog {

  readonly groupNameTxtFld = new TextField(this.rootLocator.getByTestId('GroupNameTextField'), 'Group Name')
  readonly apiTypeAc = new ApiTypeAutocomplete(this.rootLocator)
  readonly descriptionTxtFld = new TextField(this.rootLocator.getByTestId('DescriptionTextField'), 'Description')
  readonly additionalOptionsBtn = new Button(this.rootLocator.getByTestId('AdditionalOptionsButton'), 'Additional Options')
  readonly infoIcon = new Icon(this.rootLocator.getByTestId('InfoIcon'), 'Info')
  readonly filesUploader = new FilesUploader(this.rootLocator.getByTestId('UploadButtonInput'), 'OAS Template')
  readonly browseBtn = new Button(this.rootLocator.getByTestId('BrowseButton'), 'Browse')
  readonly downloadableFilePreview = new DownloadableFilePreview(this.rootLocator)
  readonly notDownloadableFilePreview = new NotDownloadableFilePreview(this.rootLocator)
  readonly updateBtn = new Button(this.rootLocator.getByTestId('UpdateButton'), 'Update')

  constructor(page: Page) {
    super(page)
  }

  async fillForm(params: Partial<{
    groupName: string
    apiType: OperationsApiType
    description: string
    template: TestFile
  }>): Promise<void> {
    params.groupName && await this.groupNameTxtFld.fill(params.groupName)
    if (params.apiType) {
      await this.apiTypeAc.click()
      switch (params.apiType) {
        case REST_API_TYPE: {
          await this.apiTypeAc.restApiItm.click()
          break
        }
        case GRAPHQL_API_TYPE: {
          await this.apiTypeAc.graphQlItm.click()
          break
        }
      }
    }
    params.description && await this.descriptionTxtFld.fill(params.description)
    if (params.template) {
      await this.filesUploader.setInputFiles({ name: params.template.name, path: params.template.path })
    }
  }

  async downloadTemplate(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download OAS Template file', async () => {
      const downloadPromise = this.page.waitForEvent('download')
      await this.downloadableFilePreview.fileName.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }
}
