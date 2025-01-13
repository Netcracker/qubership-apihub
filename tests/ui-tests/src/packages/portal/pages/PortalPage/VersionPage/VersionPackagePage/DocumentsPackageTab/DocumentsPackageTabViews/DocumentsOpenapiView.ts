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
import { DocumentsOpenapiViewToolbar } from './DocumentsOpenapiView/DocumentsOpenapiViewToolbar'
import { DocumentsOpenapiOverviewContent } from './DocumentsOpenapiView/DocumentsOpenapiOverviewContent'
import { DocumentsOperationsTable } from './DocumentsOpenapiView/DocumentsOperationsTable'

export class DocumentsOpenapiView {

  readonly toolbar = new DocumentsOpenapiViewToolbar(this.page)
  readonly overview = new DocumentsOpenapiOverviewContent({
    locator: this.page.getByTestId('OverviewContent'),
    componentName: 'Unsupported file',
  })
  readonly table = new DocumentsOperationsTable(this.page)

  constructor(protected readonly page: Page) { }
}
