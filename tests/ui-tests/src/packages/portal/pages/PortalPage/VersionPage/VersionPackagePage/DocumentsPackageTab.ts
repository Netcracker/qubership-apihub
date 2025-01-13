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
import { DocumentsPackageTabSidebar } from './DocumentsPackageTab/DocumentsPackageTabSidebar'
import { DocumentsMdView } from './DocumentsPackageTab/DocumentsPackageTabViews/DocumentsMdView'
import { DocumentsJsonSchemaView } from './DocumentsPackageTab/DocumentsPackageTabViews/DocumentsJsonSchemaView'
import { DocumentsFileView } from './DocumentsPackageTab/DocumentsPackageTabViews/DocumentsFileView'
import { DocumentsOpenapiView } from './DocumentsPackageTab/DocumentsPackageTabViews/DocumentsOpenapiView'
import { Content, Tab } from '@shared/components/base'

export class DocumentsPackageTab extends Tab {

  readonly mainLocator = this.page.getByTestId('DocumentsButton')
  readonly content = new Content(this.rootLocator, 'Documents Tab')
  readonly sidebar = new DocumentsPackageTabSidebar(this.page)
  readonly openapiView = new DocumentsOpenapiView(this.page)
  readonly mdView = new DocumentsMdView(this.page)
  readonly jsonSchemaView = new DocumentsJsonSchemaView(this.page)
  readonly fileView = new DocumentsFileView(this.page)

  constructor(page: Page) {
    super(page.getByTestId('DocumentsTab'), 'Documents')
  }
}
