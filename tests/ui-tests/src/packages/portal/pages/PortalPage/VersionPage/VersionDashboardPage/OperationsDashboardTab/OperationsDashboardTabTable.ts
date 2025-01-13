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
import type { GetOperationWithMetaParams } from '@portal/entities'
import { OperationsDashboardTableRow } from './OperationsDashboardTableRow'
import { OperationsPackageTabTable } from '../../VersionPackagePage/OperationsPackageTab/OperationsPackageTabTable'

export class OperationsDashboardTabTable extends OperationsPackageTabTable {

  constructor(protected readonly page: Page) {
    super(page)
  }

  getOperationRow(operation?: GetOperationWithMetaParams): OperationsDashboardTableRow {
    if (!operation) {
      return new OperationsDashboardTableRow(this.page.getByTestId('Cell-endpoint-column'))
    }
    if (operation?.method && operation.path) {
      return new OperationsDashboardTableRow(this.page.getByRole('cell', { name: `${operation.method} ${operation.path}` }).locator('..')
          .or(this.page.getByRole('button', { name: `${operation.method} ${operation.path}` })),
        `${operation.method} ${operation.path}`)
    }
    if (operation?.type && operation.method) {
      return new OperationsDashboardTableRow(this.page.getByRole('cell', { name: `${operation.type} ${operation.method}` }).locator('..')
          .or(this.page.getByRole('button', { name: `${operation.type} ${operation.method}` })),
        `${operation.type} ${operation.method}`)
    }
    throw Error('Operation should have method+path or type+method')
  }
}
