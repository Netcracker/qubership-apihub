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
import { Breadcrumbs, Button, Title } from '@shared/components/base'
import { OpenapiDownloadMenu } from '../OpenapiDownloadMenu'

export class DocumentPreviewPageToolbar {

  readonly breadcrumbs = new Breadcrumbs(this.page.getByTestId('PackageBreadcrumbs'), 'Document')
  readonly title = new Title(this.page.getByTestId('ToolbarTitleTypography'), 'Document')

  readonly backBtn = new Button(this.page.getByTestId('BackButton'), 'Back')
  readonly simpleBtn = new Button(this.page.locator('button[value=simple]'), 'Simple')
  readonly detailedBtn = new Button(this.page.locator('button[value=detailed]'), 'Detailed')
  readonly docBtn = new Button(this.page.locator('button[value=doc]'), 'Doc')
  readonly rawBtn = new Button(this.page.locator('button[value=raw]'), 'Raw')
  readonly exportDocumentMenu = new OpenapiDownloadMenu(this.page.getByTestId('ExportDocumentMenuButton'), 'Export')

  constructor(protected readonly page: Page) { }
}
