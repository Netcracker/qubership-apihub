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

import { test as report, type Page } from '@playwright/test'
import { Button, Link } from '@shared/components/base'
import type { DownloadedTestFile } from '@shared/entities'
import { DOWNLOAD_EXPECT } from '@test-setup'
import { CompareSelectDialog } from './BaseVersionPage/CompareSelectDialog'
import { ConfigureVersionTab } from './BaseVersionPage/ConfigureVersionTab'
import { CopyVersionDialog } from './BaseVersionPage/CopyVersionDialog'
import { MethodsForUploadDialog } from './BaseVersionPage/MethodsForUploadDialog'
import { OldRevisionDialog } from './BaseVersionPage/OldRevisionDialog'
import { PackageSettingsPage } from './BaseVersionPage/PackageSettingsPage'
import { CompareOperationsPage, ComparePackagesPage } from './ComparisonPages'
import { CompareDashboardsPage } from './ComparisonPages/CompareDashboardsPage'
import { DocumentPreviewPage } from './VersionPage/DocumentPreviewPage'
import { VersionOverviewTab } from './VersionPage/VersionOverviewTab'
import { VersionPageSidebar } from './VersionPage/VersionPageSidebar'
import { VersionPageToolbar } from './VersionPage/VersionPageToolbar'
import { getDownloadedFile } from '@services/utils'

export abstract class BaseVersionPage {

  readonly toolbar = new VersionPageToolbar(this.page)
  readonly sidebar = new VersionPageSidebar(this.page)
  readonly documentPreviewPage = new DocumentPreviewPage(this.page)
  readonly comparePackagesPage = new ComparePackagesPage(this.page)
  readonly compareOperationsPage = new CompareOperationsPage(this.page)
  readonly compareDashboardsPage = new CompareDashboardsPage(this.page)
  readonly packageSettingsPage = new PackageSettingsPage(this.page)
  readonly overviewTab = new VersionOverviewTab(this.page)
  readonly configureVersionTab = new ConfigureVersionTab(this.page)
  readonly compareSelectDialog = new CompareSelectDialog(this.page)
  readonly oldRevisionDialog = new OldRevisionDialog(this.page)
  readonly methodsForUploadDialog = new MethodsForUploadDialog(this.page)
  readonly copyVersionDialog = new CopyVersionDialog(this.page)
  readonly howToUploadBtn = new Button(this.page.getByTestId('HowToUploadButton'), 'How to Upload API documentation?')
  readonly createVersionLink = new Link(this.page.getByTestId('CreateVersionLink'), 'Create Version')

  protected constructor(protected readonly page: Page) { }

  async exportVersion(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Export version', async () => {
      const downloadPromise = this.page.waitForEvent('download', { timeout: DOWNLOAD_EXPECT })
      await this.toolbar.exportBtn.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }
}
