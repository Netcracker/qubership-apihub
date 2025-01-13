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

import { type Page, test as report } from '@playwright/test'
import type { GetOperationWithMetaParams } from '@portal/entities'
import { Link } from '@shared/components/base'
import { MainOperationTableRow } from '../../../MainOperationTableRow'
import { DocumentsTagRow } from './DocumentsTagRow'

export class DocumentsOperationsTable {

  constructor(private readonly page: Page) { }

  getOperationRow(operation?: GetOperationWithMetaParams): MainOperationTableRow {
    if (!operation) {
      return new MainOperationTableRow(this.page.getByTestId('Cell-endpoint-column'))
    }
    if (operation?.method && operation.path) {
      return new MainOperationTableRow(this.page.getByRole('cell', { name: `${operation.method} ${operation.path}` }).locator('..'),
        `${operation.method} ${operation.path}`)
    }
    if (operation?.type && operation.method) {
      return new MainOperationTableRow(this.page.getByRole('cell', { name: `${operation.type} ${operation.method}` }).locator('..'),
        `${operation.type} ${operation.method}`)
    }
    throw Error('Operation should have method+path or type+method')
  }

  getTagRow(tagName?: string): DocumentsTagRow {
    if (tagName) {
      return new DocumentsTagRow(this.page.getByRole('cell', {
        name: `${tagName}`,
        exact: true,
      }).locator('..'), tagName)
    } else {
      return new DocumentsTagRow(this.page.getByTestId('TagCell').filter({ hasText: /.+/ }))
    }
  }

  async openOperation(operation: GetOperationWithMetaParams): Promise<void> {
    await report.step(`Open "${operation.method} ${operation.path}" operation`, async () => {
      const link = new Link(this.getOperationRow(operation).mainLocator.getByRole('link'), `${operation.method} ${operation.path}`)
      await link.click()
    })
  }

  async expandTag(tagName: string): Promise<void> {
    await report.step(`Expand "${tagName} tag`, async () => {
      await this.getTagRow(tagName).expandBtn.click()
    })
  }

  async collapseTag(tagName: string): Promise<void> {
    await report.step(`Expand "${tagName} tag`, async () => {
      await this.getTagRow(tagName).collapseBtn.click()
    })
  }
}
