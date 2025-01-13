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
import { Breadcrumbs, Button, Content, FilesUploader, Icon, SearchBar, Tab, Title } from '@shared/components/base'
import { ApiSpecPopup, BaseDeleteDialog } from '@shared/components/custom'
import { ConfigurePackagesTab } from './ConfigureVersionTab/ConfigurePackagesTab'
import { ConfigureVersionFileRow } from './ConfigureVersionTab/ConfigureVersionFileRow'
import { EditFileLabelsDialog } from './ConfigureVersionTab/EditFileLabelsDialog'
import { PortalPublishVersionDialog } from './ConfigureVersionTab/PortalPublishVersionDialog'
import { nthPostfix } from '@services/utils'

export class ConfigureVersionTab extends Tab {

  readonly breadcrumbs = new Breadcrumbs(this.page.getByTestId('PackageBreadcrumbs'), 'Edit Version')
  readonly title = new Title(this.page.getByTestId('ToolbarTitleTypography'), 'Edit Version')
  readonly version = new Content(this.page.getByTestId('VersionTitle'), 'Version title')
  readonly status = new Content(this.page.getByTestId('VersionStatusChip'), 'Version Status')
  readonly publishBtn = new Button(this.page.getByTestId('PublishButton'), 'Publish')
  readonly exitBtn = new Button(this.page.getByTestId('ExitButton'), 'Exit')
  readonly infoIcon = new Icon(this.page.getByTestId('CardHeader').getByTestId('InfoOutlinedIcon'), 'Title', 'info icon')
  readonly searchbar = new SearchBar(this.page.getByTestId('SearchFile'), 'File')
  readonly browseFilesBtn = new Button(this.page.getByTestId('BrowseFilesButton'), 'Browse Files')
  readonly browseBtn = new Button(this.page.getByTestId('BrowseButton'), 'browse')
  readonly filesUploader = new FilesUploader(this.page.getByTestId('FileUpload'), 'Configure Version')
  readonly buttonFilesUploader = new FilesUploader(this.page.getByTestId('UploadButtonInput').or(this.page.locator('#contained-button-file')), 'Configure Version') //TODO: remove after merge UI new stack (#contained-button-file)
  readonly publishVersionDialog = new PortalPublishVersionDialog(this.page)
  readonly deleteFileDialog = new BaseDeleteDialog(this.page)
  readonly editFileLabelsDialog = new EditFileLabelsDialog(this.page)
  readonly apiSpecPopup = new ApiSpecPopup(this.page)
  readonly confPackagesTab = new ConfigurePackagesTab(this.page)

  constructor(page: Page) {
    super(page.getByTestId('ConfigureDashboardButton'), 'Configure Version')
  }

  getFileRow(fileId?: string): ConfigureVersionFileRow
  getFileRow(nth?: number): ConfigureVersionFileRow
  getFileRow(fileIdOrNth?: string | number): ConfigureVersionFileRow {
    if (!fileIdOrNth) {
      return new ConfigureVersionFileRow(this.page.getByTestId('Cell-file-column'))
    }
    if (typeof fileIdOrNth === 'string') {
      return new ConfigureVersionFileRow(this.page.getByRole('cell', {
          name: fileIdOrNth,
          exact: true,
        }).locator('..'),
        fileIdOrNth)
    }
    return new ConfigureVersionFileRow(this.page.getByTestId('Cell-group-name').nth(fileIdOrNth - 1), '', `${nthPostfix(fileIdOrNth)} file row`)
  }
}
